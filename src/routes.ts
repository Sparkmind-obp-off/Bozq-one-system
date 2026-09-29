import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings, Principal, Variables } from './index'
import { canTransition, localDate, localTime, money, normalizeWhatsapp, projectedTotal, text, validId } from './operations'
import { digest } from './security'

const ops = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const branch = 'utama' // MVP branch; all queries remain branch-scoped.
const bad = (message: string, status: 400 | 403 | 404 | 409 = 400): never => { throw new HTTPException(status, { message }) }
const person = (c: { get: (key: 'principal') => Principal }) => c.get('principal')
const uuid = (value: unknown) => validId(value) ? value : bad('ID tidak valid.')
const optionalId = (value: unknown) => value == null || value === '' ? null : uuid(value)
const value = (input: unknown, max = 80) => text(input, max)
const nowLocal = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(' ', 'T')
const today = () => nowLocal().slice(0, 10)

async function body(c: any): Promise<Record<string, any>> {
  const input = await c.req.json().catch(() => bad('Kirim JSON yang valid.'))
  if (!input || typeof input !== 'object' || Array.isArray(input)) bad('Kirim objek JSON yang valid.')
  return input
}
function audit(db: D1Database, actor: string, action: string, entity: string, id: string, before: unknown, after: unknown) {
  return db.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id, before_snapshot, after_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), branch, actor, action, entity, id, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after))
}
async function checkCustomer(db: D1Database, id: string | null) {
  if (id && !await db.prepare('SELECT id FROM customer WHERE id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'active').first()) bad('Pelanggan tidak ditemukan.', 404)
}
async function checkCapster(db: D1Database, id: string | null) {
  if (id && !await db.prepare('SELECT id FROM capster WHERE id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'active').first()) bad('Capster tidak aktif atau tidak ditemukan.', 400)
}
async function activeService(db: D1Database, id: string | null) {
  if (!id) return null
  const record = await db.prepare('SELECT id, name FROM service WHERE id = ? AND branch_id = ? AND active = 1').bind(id, branch).first<{ id: string; name: string }>()
  if (!record) bad('Layanan tidak aktif atau tidak ditemukan.', 400)
  return record
}
async function currentPrice(db: D1Database, serviceId: string | null) {
  if (!serviceId) return null
  const rule = await db.prepare('SELECT price FROM price_rule WHERE service_id = ? AND branch_id = ? AND effective_to IS NULL ORDER BY effective_from DESC LIMIT 1').bind(serviceId, branch).first<{ price: number }>()
  return rule?.price ?? null
}
async function repeated(db: D1Database, table: 'customer' | 'visit' | 'booking', id: string, hash: string) {
  const found = await db.prepare(`SELECT id, request_hash FROM ${table} WHERE id = ? AND branch_id = ?`).bind(id, branch).first<{ id: string; request_hash: string }>()
  if (found && found.request_hash !== hash) bad('ID sudah dipakai untuk data berbeda.', 409)
  return found != null
}

ops.use('*', async (c, next) => {
  if (!person(c)) return c.json({ error: 'Silakan masuk.' }, 401)
  await next()
})
ops.use('/owner/*', async (c, next) => {
  if (person(c).role !== 'owner') return c.json({ error: 'Hanya pemilik yang boleh mengubah pengaturan.' }, 403)
  await next()
})

ops.get('/customers', async c => {
  const search = (c.req.query('q') ?? '').trim().slice(0, 80).replace(/[\\%_]/g, '\\$&')
  const rows = await c.env.DB.prepare(`SELECT c.id, c.name, c.whatsapp, c.last_visit_at, c.created_at, (SELECT count(*) FROM visit v WHERE v.customer_id = c.id AND v.status = 'completed') AS completed_visits FROM customer c WHERE c.branch_id = ? AND c.status = 'active' AND (c.name LIKE ? ESCAPE '\\' OR c.normalized_whatsapp LIKE ? ESCAPE '\\') ORDER BY c.updated_at DESC, c.id DESC LIMIT 40`).bind(branch, `%${search}%`, `%${search}%`).all()
  return c.json({ customers: rows.results })
})

ops.post('/customers', async c => {
  const input = await body(c)
  const id = uuid(input.id)
  const name = value(input.name)
  const whatsapp = normalizeWhatsapp(input.whatsapp)
  if (!name && !whatsapp) bad('Isi nama atau WhatsApp, atau catat walk-in anonim.')
  const hash = await digest(JSON.stringify({ name, whatsapp }))
  if (await repeated(c.env.DB, 'customer', id, hash)) return c.json({ id, repeated: true })
  if (whatsapp && await c.env.DB.prepare('SELECT id FROM customer WHERE branch_id = ? AND normalized_whatsapp = ?').bind(branch, whatsapp).first()) bad('Nomor WhatsApp sudah tercatat. Pilih pelanggan yang ada.', 409)
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO customer (id, branch_id, name, whatsapp, normalized_whatsapp, request_hash) VALUES (?, ?, ?, ?, ?, ?)').bind(id, branch, name, whatsapp, whatsapp, hash),
    audit(c.env.DB, person(c).id, 'customer_created', 'customer', id, null, { name, whatsapp })
  ])
  return c.json({ id, name, whatsapp }, 201)
})

ops.get('/customers/:id', async c => {
  const id = uuid(c.req.param('id'))
  const customer = await c.env.DB.prepare('SELECT id, name, whatsapp, first_seen_at, last_visit_at, created_at FROM customer WHERE id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'active').first()
  if (!customer) bad('Pelanggan tidak ditemukan.', 404)
  const history = await c.env.DB.prepare('SELECT v.id, v.occurred_at, v.status, v.source, v.booking_id, v.service_id, COALESCE(s.name, v.service_summary) AS service, ca.display_name AS capster FROM visit v LEFT JOIN service s ON s.id = v.service_id LEFT JOIN capster ca ON ca.id = v.capster_id WHERE v.customer_id = ? AND v.branch_id = ? ORDER BY v.occurred_at DESC, v.id DESC LIMIT 100').bind(id, branch).all()
  const count = await c.env.DB.prepare("SELECT count(*) AS total FROM visit WHERE customer_id = ? AND branch_id = ? AND status = 'completed'").bind(id, branch).first<{ total: number }>()
  return c.json({ customer, visits: history.results, completed_visits: count?.total ?? 0 })
})

ops.patch('/customers/:id', async c => {
  const id = uuid(c.req.param('id'))
  const prior = await c.env.DB.prepare('SELECT id, name, whatsapp, normalized_whatsapp FROM customer WHERE id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'active').first<{ id: string; name: string | null; whatsapp: string | null; normalized_whatsapp: string | null }>()
  if (!prior) return bad('Pelanggan tidak ditemukan.', 404)
  const input = await body(c)
  if (!Object.hasOwn(input, 'name') && !Object.hasOwn(input, 'whatsapp')) bad('Tidak ada perubahan.')
  const name = Object.hasOwn(input, 'name') ? value(input.name) : prior.name
  const whatsapp = Object.hasOwn(input, 'whatsapp') ? normalizeWhatsapp(input.whatsapp) : prior.normalized_whatsapp
  if (!name && !whatsapp) bad('Pelanggan harus memiliki nama atau WhatsApp.')
  if (whatsapp && whatsapp !== prior.normalized_whatsapp && await c.env.DB.prepare('SELECT id FROM customer WHERE branch_id = ? AND normalized_whatsapp = ?').bind(branch, whatsapp).first()) bad('Nomor WhatsApp sudah tercatat.', 409)
  const after = { name, whatsapp }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE customer SET name = ?, whatsapp = ?, normalized_whatsapp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ?').bind(name, whatsapp, whatsapp, id, branch),
    audit(c.env.DB, person(c).id, 'customer_updated', 'customer', id, { name: prior.name, whatsapp: prior.whatsapp }, after)
  ])
  return c.json({ id, ...after })
})

ops.get('/capsters', async c => {
  const all = person(c).role === 'owner' && c.req.query('all') === '1'
  const rows = await c.env.DB.prepare(`SELECT id, display_name, status, user_id FROM capster WHERE branch_id = ? ${all ? '' : "AND status = 'active'"} ORDER BY display_name LIMIT 50`).bind(branch).all()
  return c.json({ capsters: rows.results })
})

ops.post('/owner/capsters', async c => {
  const input = await body(c)
  const name = value(input.name)
  if (!name) bad('Nama capster diperlukan.')
  const id = uuid(input.id)
  const existing = await c.env.DB.prepare('SELECT display_name FROM capster WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ display_name: string }>()
  if (existing) return existing.display_name === name ? c.json({ id, repeated: true }) : bad('ID capster sudah digunakan.', 409)
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO capster (id, branch_id, display_name) VALUES (?, ?, ?)').bind(id, branch, name),
    audit(c.env.DB, person(c).id, 'capster_created', 'capster', id, null, { name, status: 'active' })
  ])
  return c.json({ id, name, status: 'active' }, 201)
})

ops.patch('/owner/capsters/:id', async c => {
  const id = uuid(c.req.param('id'))
  const prior = await c.env.DB.prepare('SELECT display_name, status FROM capster WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ display_name: string; status: string }>()
  if (!prior) return bad('Capster tidak ditemukan.', 404)
  const input = await body(c)
  const name = Object.hasOwn(input, 'name') ? value(input.name) : prior.display_name
  const status = Object.hasOwn(input, 'status') ? input.status : prior.status
  if (!name || !['active', 'inactive'].includes(status)) bad('Data capster tidak valid.')
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE capster SET display_name = ?, status = ? WHERE id = ? AND branch_id = ?').bind(name, status, id, branch),
    audit(c.env.DB, person(c).id, 'capster_updated', 'capster', id, prior, { display_name: name, status })
  ])
  return c.json({ id, name, status })
})

ops.get('/services', async c => {
  const all = person(c).role === 'owner' && c.req.query('all') === '1'
  const rows = await c.env.DB.prepare(`SELECT s.id, s.name, s.category, s.active, (SELECT p.price FROM price_rule p WHERE p.service_id = s.id AND p.effective_to IS NULL ORDER BY p.effective_from DESC LIMIT 1) AS price FROM service s WHERE s.branch_id = ? ${all ? '' : 'AND s.active = 1'} ORDER BY s.name LIMIT 100`).bind(branch).all()
  return c.json({ services: rows.results })
})

ops.post('/owner/services', async c => {
  const input = await body(c)
  const name = value(input.name)
  const price = money(input.price)
  if (!name) bad('Nama layanan diperlukan.')
  const id = uuid(input.id)
  const existing = await c.env.DB.prepare('SELECT name FROM service WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ name: string }>()
  if (existing) {
    const existingPrice = await currentPrice(c.env.DB, id)
    return existing.name === name && existingPrice === price ? c.json({ id, repeated: true }) : bad('ID layanan sudah digunakan.', 409)
  }
  const statements = [c.env.DB.prepare('INSERT INTO service (id, branch_id, name) VALUES (?, ?, ?)').bind(id, branch, name)]
  if (price !== null) statements.push(c.env.DB.prepare('INSERT INTO price_rule (id, branch_id, service_id, price, effective_from, source) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), branch, id, price, new Date().toISOString(), 'owner_config'))
  statements.push(audit(c.env.DB, person(c).id, 'service_created', 'service', id, null, { name, price, active: 1 }))
  await c.env.DB.batch(statements)
  return c.json({ id, name, price, active: 1 }, 201)
})

ops.patch('/owner/services/:id', async c => {
  const id = uuid(c.req.param('id'))
  const prior = await c.env.DB.prepare('SELECT id, name, active FROM service WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ id: string; name: string; active: number }>()
  if (!prior) return bad('Layanan tidak ditemukan.', 404)
  const oldPrice = await currentPrice(c.env.DB, id)
  const input = await body(c)
  const name = Object.hasOwn(input, 'name') ? value(input.name) : prior.name
  const active = Object.hasOwn(input, 'active') ? input.active : prior.active
  const price = Object.hasOwn(input, 'price') ? money(input.price) : oldPrice
  if (!name || ![0, 1].includes(active)) bad('Data layanan tidak valid.')
  const statements = [c.env.DB.prepare('UPDATE service SET name = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ?').bind(name, active, id, branch)]
  if (price !== oldPrice) {
    const when = new Date().toISOString()
    statements.push(c.env.DB.prepare('UPDATE price_rule SET effective_to = ? WHERE service_id = ? AND branch_id = ? AND effective_to IS NULL').bind(when, id, branch))
    if (price !== null) statements.push(c.env.DB.prepare('INSERT INTO price_rule (id, branch_id, service_id, price, effective_from, source) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), branch, id, price, when, 'owner_config'))
  }
  statements.push(audit(c.env.DB, person(c).id, 'service_updated', 'service', id, { name: prior.name, active: prior.active, price: oldPrice }, { name, active, price }))
  await c.env.DB.batch(statements)
  return c.json({ id, name, active, price })
})

ops.post('/visits', async c => {
  const input = await body(c)
  const id = uuid(input.id)
  const customerId = optionalId(input.customer_id)
  const capsterId = optionalId(input.capster_id)
  const serviceId = optionalId(input.service_id)
  const serviceSummary = value(input.service_summary, 120)
  const service = await activeService(c.env.DB, serviceId)
  await checkCustomer(c.env.DB, customerId)
  await checkCapster(c.env.DB, capsterId)
  const normalized = { customerId, capsterId, serviceId, serviceSummary }
  const hash = await digest(JSON.stringify(normalized))
  if (await repeated(c.env.DB, 'visit', id, hash)) return c.json({ id, repeated: true })
  const at = nowLocal()
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO visit (id, branch_id, customer_id, capster_id, service_id, occurred_at, status, service_summary, source, request_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, branch, customerId, capsterId, serviceId, at, 'arrived', service?.name ?? serviceSummary, 'walk_in', hash),
    audit(c.env.DB, person(c).id, 'walk_in_created', 'visit', id, null, { ...normalized, status: 'arrived' })
  ])
  return c.json({ id, status: 'arrived', source: 'walk_in', customer_id: customerId, capster_id: capsterId, service_id: serviceId }, 201)
})

ops.patch('/visits/:id/status', async c => {
  const id = uuid(c.req.param('id'))
  const input = await body(c)
  const next = input.status
  const prior = await c.env.DB.prepare('SELECT id, status, customer_id, occurred_at, booking_id FROM visit WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ id: string; status: string; customer_id: string | null; occurred_at: string; booking_id: string | null }>()
  if (!prior) return bad('Kunjungan tidak ditemukan.', 404)
  if (prior.booking_id) bad('Ubah status booking untuk kunjungan yang terhubung.', 409)
  if (!canTransition('visit', prior.status, next)) bad('Perpindahan status kunjungan tidak diizinkan.', 409)
  const statements = [
    c.env.DB.prepare('UPDATE visit SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ? AND status = ?').bind(next, id, branch, prior.status),
    audit(c.env.DB, person(c).id, 'visit_status_changed', 'visit', id, { status: prior.status }, { status: next })
  ]
  if (next === 'completed' && prior.customer_id) statements.push(customerVisitStatement(c.env.DB, prior.customer_id, prior.occurred_at))
  const result = await c.env.DB.batch(statements)
  if (!result[0].meta.changes) bad('Status telah berubah. Muat ulang.', 409)
  return c.json({ id, status: next })
})

function customerVisitStatement(db: D1Database, customerId: string, at: string) {
  return db.prepare(`UPDATE customer SET first_seen_at = CASE WHEN first_seen_at IS NULL OR first_seen_at > ? THEN ? ELSE first_seen_at END, last_visit_at = CASE WHEN last_visit_at IS NULL OR last_visit_at < ? THEN ? ELSE last_visit_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ?`).bind(at, at, at, at, customerId, branch)
}

ops.get('/visits', async c => {
  const date = localDate(c.req.query('date') ?? today())
  const rows = await c.env.DB.prepare(`SELECT v.id, v.customer_id, v.capster_id, v.service_id, v.occurred_at, v.status, v.source, v.service_summary, v.booking_id, c.name AS customer_name, ca.display_name AS capster_name, s.name AS service_name FROM visit v LEFT JOIN customer c ON c.id = v.customer_id LEFT JOIN capster ca ON ca.id = v.capster_id LEFT JOIN service s ON s.id = v.service_id WHERE v.branch_id = ? AND substr(v.occurred_at, 1, 10) = ? ORDER BY v.occurred_at DESC, v.id DESC LIMIT 150`).bind(branch, date).all()
  return c.json({ date, visits: rows.results })
})

ops.post('/bookings', async c => {
  const input = await body(c)
  const id = uuid(input.id)
  const scheduled = localTime(input.scheduled_start)
  const customerId = optionalId(input.customer_id)
  const capsterId = optionalId(input.capster_id)
  const notes = value(input.notes, 300)
  const peopleInput = input.people
  if (!Array.isArray(peopleInput) || peopleInput.length < 1 || peopleInput.length > 8) bad('Isi 1–8 orang dalam booking.')
  await checkCustomer(c.env.DB, customerId)
  await checkCapster(c.env.DB, capsterId)
  const people: { customerId: string | null; serviceId: string | null; capsterId: string | null; price: number | null }[] = []
  for (let index = 0; index < peopleInput.length; index++) {
    const entry = peopleInput[index]
    if (!entry || typeof entry !== 'object') bad('Data orang dalam booking tidak valid.')
    const personCustomer = optionalId(entry.customer_id ?? (index === 0 ? customerId : null))
    const personService = optionalId(entry.service_id)
    const personCapster = optionalId(entry.capster_id ?? capsterId)
    await checkCustomer(c.env.DB, personCustomer)
    await checkCapster(c.env.DB, personCapster)
    await activeService(c.env.DB, personService)
    people.push({ customerId: personCustomer, serviceId: personService, capsterId: personCapster, price: await currentPrice(c.env.DB, personService) })
  }
  const hash = await digest(JSON.stringify({ scheduled, customerId, capsterId, notes, people: people.map(({ customerId, serviceId, capsterId }) => ({ customerId, serviceId, capsterId })) }))
  if (await repeated(c.env.DB, 'booking', id, hash)) return c.json({ id, repeated: true })
  const projected = projectedTotal(people.map(entry => entry.price))
  const statements = [c.env.DB.prepare('INSERT INTO booking (id, branch_id, customer_id, booked_by, scheduled_start, party_size, preferred_capster_id, status, notes, projected_value, request_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, branch, customerId, person(c).id, scheduled, people.length, capsterId, 'confirmed', notes, projected, hash)]
  for (const entry of people) statements.push(c.env.DB.prepare('INSERT INTO booking_person (id, booking_id, customer_id, service_id, capster_id, projected_unit_value) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, entry.customerId, entry.serviceId, entry.capsterId, entry.price))
  statements.push(audit(c.env.DB, person(c).id, 'booking_created', 'booking', id, null, { scheduled, party_size: people.length, projected_value: projected, status: 'confirmed' }))
  await c.env.DB.batch(statements)
  return c.json({ id, status: 'confirmed', party_size: people.length, projected_value: projected, actual_value: null }, 201)
})

ops.get('/bookings', async c => {
  const date = localDate(c.req.query('date') ?? today())
  const rows = await c.env.DB.prepare('SELECT b.id, b.customer_id, b.scheduled_start, b.status, b.party_size, b.projected_value, b.preferred_capster_id, b.notes, c.name AS customer_name, ca.display_name AS capster_name FROM booking b LEFT JOIN customer c ON c.id = b.customer_id LEFT JOIN capster ca ON ca.id = b.preferred_capster_id WHERE b.branch_id = ? AND substr(b.scheduled_start, 1, 10) = ? ORDER BY b.scheduled_start ASC, b.id ASC LIMIT 100').bind(branch, date).all()
  return c.json({ date, bookings: rows.results })
})

ops.get('/bookings/:id', async c => {
  const id = uuid(c.req.param('id'))
  const booking = await c.env.DB.prepare('SELECT id, customer_id, scheduled_start, status, party_size, projected_value, preferred_capster_id, notes FROM booking WHERE id = ? AND branch_id = ?').bind(id, branch).first()
  if (!booking) return bad('Booking tidak ditemukan.', 404)
  const people = await c.env.DB.prepare('SELECT bp.id, bp.customer_id, bp.service_id, bp.capster_id, bp.projected_unit_value, c.name AS customer_name, s.name AS service_name, ca.display_name AS capster_name, v.id AS visit_id, v.status AS visit_status FROM booking_person bp LEFT JOIN customer c ON c.id = bp.customer_id LEFT JOIN service s ON s.id = bp.service_id LEFT JOIN capster ca ON ca.id = bp.capster_id LEFT JOIN visit v ON v.booking_person_id = bp.id WHERE bp.booking_id = ? ORDER BY bp.created_at, bp.id LIMIT 8').bind(id).all()
  return c.json({ booking, people: people.results, actual_value: null })
})

ops.patch('/bookings/:id/status', async c => {
  const id = uuid(c.req.param('id'))
  const input = await body(c)
  const next = input.status
  const prior = await c.env.DB.prepare('SELECT id, status, scheduled_start, party_size FROM booking WHERE id = ? AND branch_id = ?').bind(id, branch).first<{ id: string; status: string; scheduled_start: string; party_size: number }>()
  if (!prior) return bad('Booking tidak ditemukan.', 404)
  if (prior.status === next) return c.json({ id, status: next, repeated: true })
  if (!canTransition('booking', prior.status, next)) bad('Perpindahan status booking tidak diizinkan.', 409)
  const statements = [c.env.DB.prepare('UPDATE booking SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ? AND status = ?').bind(next, id, branch, prior.status)]
  if (next === 'arrived') {
    const people = await c.env.DB.prepare('SELECT bp.id, bp.customer_id, bp.capster_id, bp.service_id, s.name AS service_name FROM booking_person bp LEFT JOIN service s ON s.id = bp.service_id WHERE bp.booking_id = ? ORDER BY bp.id LIMIT 8').bind(id).all<{ id: string; customer_id: string | null; capster_id: string | null; service_id: string | null; service_name: string | null }>()
    if (people.results.length !== prior.party_size) bad('Data orang booking tidak lengkap.', 409)
    for (const entry of people.results) statements.push(c.env.DB.prepare('INSERT INTO visit (id, branch_id, customer_id, capster_id, service_id, booking_id, booking_person_id, occurred_at, status, service_summary, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), branch, entry.customer_id, entry.capster_id, entry.service_id, id, entry.id, nowLocal(), 'arrived', entry.service_name, 'booking'))
  }
  if (next === 'in_service' || next === 'completed' || next === 'cancelled') {
    statements.push(c.env.DB.prepare('UPDATE visit SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND branch_id = ? AND status = ?').bind(next, id, branch, prior.status))
  }
  if (next === 'completed') {
    const rows = await c.env.DB.prepare('SELECT customer_id, occurred_at FROM visit WHERE booking_id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'in_service').all<{ customer_id: string | null; occurred_at: string }>()
    if (rows.results.length !== prior.party_size) bad('Kunjungan booking tidak lengkap.', 409)
    for (const row of rows.results) if (row.customer_id) statements.push(customerVisitStatement(c.env.DB, row.customer_id, row.occurred_at))
  }
  statements.push(audit(c.env.DB, person(c).id, 'booking_status_changed', 'booking', id, { status: prior.status }, { status: next }))
  const result = await c.env.DB.batch(statements)
  if (!result[0].meta.changes) bad('Status booking telah berubah. Muat ulang.', 409)
  return c.json({ id, status: next, actual_value: null })
})

ops.get('/today', async c => {
  const date = localDate(c.req.query('date') ?? today())
  const [bookings, visits, finance] = await Promise.all([
    c.env.DB.prepare('SELECT status, count(*) AS total, sum(party_size) AS people, sum(projected_value) AS projected, sum(CASE WHEN projected_value IS NULL THEN 1 ELSE 0 END) AS unpriced FROM booking WHERE branch_id = ? AND substr(scheduled_start, 1, 10) = ? GROUP BY status').bind(branch, date).all<{ status: string; total: number; people: number; projected: number | null; unpriced: number }>(),
    c.env.DB.prepare('SELECT status, source, count(*) AS total FROM visit WHERE branch_id = ? AND substr(occurred_at, 1, 10) = ? GROUP BY status, source').bind(branch, date).all<{ status: string; source: string; total: number }>(),
    c.env.DB.prepare("SELECT count(*) AS records, sum(gross_amount) AS amount FROM transaction_snapshot WHERE branch_id = ? AND source_system = 'kasir_pro' AND substr(transaction_time, 1, 10) = ? AND reconciliation_status != 'conflict'").bind(branch, date).first<{ records: number; amount: number | null }>()
  ])
  const active = bookings.results.filter(b => ['confirmed', 'arrived', 'in_service'].includes(b.status))
  return c.json({ date, counts: {
    confirmed: bookings.results.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.people, 0),
    walk_in: visits.results.filter(v => v.source === 'walk_in').reduce((sum, v) => sum + v.total, 0),
    arrived: visits.results.filter(v => v.status === 'arrived').reduce((sum, v) => sum + v.total, 0),
    in_service: visits.results.filter(v => v.status === 'in_service').reduce((sum, v) => sum + v.total, 0),
    completed: visits.results.filter(v => v.status === 'completed').reduce((sum, v) => sum + v.total, 0),
    cancelled: bookings.results.filter(b => b.status === 'cancelled').reduce((sum, b) => sum + b.total, 0) + visits.results.filter(v => v.source === 'walk_in' && v.status === 'cancelled').reduce((sum, v) => sum + v.total, 0),
    no_show: bookings.results.filter(b => b.status === 'no_show').reduce((sum, b) => sum + b.total, 0)
  }, projected_value: active.reduce((sum, b) => sum + (b.projected ?? 0), 0), projection_incomplete: active.some(b => b.unpriced > 0), actual_value: finance && finance.records > 0 ? finance.amount : null, actual_source: 'kasir_pro_import_only' })
})

export default ops
