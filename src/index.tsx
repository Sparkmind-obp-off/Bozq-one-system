import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { can, digest, hashPassword, newSessionToken, verifyPassword, type Role } from './security'

type Bindings = { DB: D1Database }
type Principal = { id: string; display_name: string; role: Role; business_id: string }
type Variables = { principal: Principal }
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const cookieName = 'bosku_session'
const sessionSeconds = 60 * 60 * 24 * 7

app.onError((error, c) => {
  console.error('Request failed:', error instanceof Error ? error.name : 'Unknown error')
  return c.json({ error: 'Layanan belum tersedia. Coba lagi nanti.' }, 500)
})

app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('Origin')
    if (origin && origin !== new URL(c.req.url).origin) return c.json({ error: 'Asal permintaan tidak diizinkan.' }, 403)
    if (!origin) return c.json({ error: 'Asal permintaan diperlukan.' }, 403)
    if (!c.req.header('Content-Type')?.toLowerCase().startsWith('application/json')) return c.json({ error: 'Gunakan JSON.' }, 415)
  }
  await next()
})

app.use('/api/*', async (c, next) => {
  const token = getCookie(c, cookieName)
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    const principal = await c.env.DB.prepare(`SELECT u.id, u.display_name, u.role, u.business_id FROM session s JOIN app_user u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`).bind(await digest(token), new Date().toISOString()).first<Principal>()
    if (principal) c.set('principal', principal)
  }
  await next()
})

function principal(c: { get: (key: 'principal') => Principal }): Principal | undefined { return c.get('principal') }

async function issueSession(c: any, userId: string) {
  const token = newSessionToken()
  const expires = new Date(Date.now() + sessionSeconds * 1000).toISOString()
  await c.env.DB.prepare('INSERT INTO session (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token), userId, expires).run()
  setCookie(c, cookieName, token, { httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', path: '/', maxAge: sessionSeconds })
}

export function normalizeWhatsapp(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('08')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits
  if (digits.startsWith('620')) return '62' + digits.slice(3)
  if (digits.startsWith('62')) return digits
  return digits
}

function cleanOptionalText(value: unknown, max = 160): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned ? cleaned.slice(0, max) : null
}

async function audit(c: any, actor: Principal, action: string, entityType: string, entityId: string, after?: unknown, before?: unknown) {
  await c.env.DB.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id, before_snapshot, after_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'utama', actor.id, action, entityType, entityId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null).run()
}

app.get('/api/status', async c => {
  const row = await c.env.DB.prepare("SELECT count(*) as total FROM app_user WHERE role = 'owner'").first<{ total: number }>()
  return c.json({ ready: (row?.total ?? 0) > 0, authenticated: !!principal(c) })
})

app.post('/api/bootstrap', async c => {
  const existing = await c.env.DB.prepare("SELECT id FROM app_user WHERE role = 'owner' LIMIT 1").first()
  if (existing) return c.json({ error: 'Pemilik sudah dibuat.' }, 409)
  const body = await c.req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const password = body?.password
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || name.length < 2 || name.length > 80 || typeof password !== 'string' || password.length < 12 || password.length > 128) return c.json({ error: 'Nama, username, atau sandi tidak valid (minimal 12 karakter).' }, 400)
  const id = crypto.randomUUID()
  const hashed = await hashPassword(password)
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO business (id, name) VALUES (?, ?)').bind('bosku', 'Bosku Cukur'),
    c.env.DB.prepare('INSERT INTO branch (id, business_id, name) VALUES (?, ?, ?)').bind('utama', 'bosku', 'Cabang Utama'),
    c.env.DB.prepare('INSERT INTO app_user (id, business_id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').bind(id, 'bosku', name, username, hashed, 'owner'),
    c.env.DB.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id, after_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), 'utama', id, 'bootstrap', 'app_user', id, JSON.stringify({ role: 'owner', username }))
  ])
  await issueSession(c, id)
  return c.json({ ok: true, user: { id, display_name: name, role: 'owner' } }, 201)
})

app.post('/api/login', async c => {
  const body = await c.req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = body?.password
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || typeof password !== 'string' || password.length > 128) return c.json({ error: 'Username atau sandi salah.' }, 401)
  const user = await c.env.DB.prepare('SELECT id, display_name, role, password_hash, failed_logins, locked_until FROM app_user WHERE username = ? AND status = ?').bind(username, 'active').first<{ id: string; display_name: string; role: Role; password_hash: string; failed_logins: number; locked_until: string | null }>()
  if (!user) return c.json({ error: 'Username atau sandi salah.' }, 401)
  if (user.locked_until && user.locked_until > new Date().toISOString()) return c.json({ error: 'Akun sementara terkunci. Coba lagi nanti.' }, 429)
  if (!await verifyPassword(password, user.password_hash)) {
    const failures = user.failed_logins + 1
    const locked = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
    await c.env.DB.prepare('UPDATE app_user SET failed_logins = ?, locked_until = ? WHERE id = ?').bind(failures >= 5 ? 0 : failures, locked, user.id).run()
    return c.json({ error: 'Username atau sandi salah.' }, 401)
  }
  await c.env.DB.prepare('UPDATE app_user SET failed_logins = 0, locked_until = NULL WHERE id = ?').bind(user.id).run()
  await issueSession(c, user.id)
  return c.json({ ok: true, user: { id: user.id, display_name: user.display_name, role: user.role } })
})

app.post('/api/logout', async c => {
  const token = getCookie(c, cookieName)
  if (token) await c.env.DB.prepare('DELETE FROM session WHERE token_hash = ?').bind(await digest(token)).run()
  deleteCookie(c, cookieName, { path: '/' })
  return c.json({ ok: true })
})

app.use('/api/owner/*', async (c, next) => {
  const user = principal(c)
  if (!user) return c.json({ error: 'Silakan masuk.' }, 401)
  if (!can(user.role, 'administration')) return c.json({ error: 'Hanya pemilik yang boleh mengakses.' }, 403)
  await next()
})

app.use('/api/data/*', async (c, next) => {
  const user = principal(c)
  if (!user) return c.json({ error: 'Silakan masuk.' }, 401)
  await next()
})

app.get('/api/me', c => {
  const user = principal(c)
  return user ? c.json({ user }) : c.json({ error: 'Silakan masuk.' }, 401)
})

app.get('/api/owner/overview', async c => {
  const counts = await c.env.DB.prepare('SELECT (SELECT count(*) FROM customer) AS customers, (SELECT count(*) FROM visit) AS visits, (SELECT count(*) FROM booking) AS bookings, (SELECT count(*) FROM transaction_snapshot) AS transactions').first()
  return c.json({ counts, note: 'Fondasi aktif. Angka transaksi hanya berasal dari impor Kasir Pro yang belum diimplementasikan.' })
})

app.get('/api/owner/audit', async c => {
  const result = await c.env.DB.prepare('SELECT id, actor_user_id, action, entity_type, entity_id, occurred_at, before_snapshot, after_snapshot, metadata FROM audit_event ORDER BY occurred_at DESC LIMIT 50').all()
  return c.json({ events: result.results })
})

app.post('/api/owner/users', async c => {
  const actor = principal(c)!
  const body = await c.req.json().catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const password = body?.password
  const role = body?.role
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || name.length < 2 || name.length > 80 || typeof password !== 'string' || password.length < 12 || password.length > 128 || !['operator', 'capster'].includes(role)) return c.json({ error: 'Data pengguna tidak valid.' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO app_user (id, business_id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').bind(id, actor.business_id, name, username, await hashPassword(password), role),
    c.env.DB.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id, after_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), 'utama', actor.id, 'user_created', 'app_user', id, JSON.stringify({ username, role, name }))
  ])
  return c.json({ id, username, name, role }, 201)
})

app.get('/api/data/capsters', async c => {
  const result = await c.env.DB.prepare("SELECT id, display_name, status FROM capster WHERE branch_id = 'utama' AND status = 'active' ORDER BY display_name").all()
  return c.json({ capsters: result.results })
})

app.get('/api/data/services', async c => {
  const result = await c.env.DB.prepare("SELECT id, name, category FROM service WHERE branch_id = 'utama' AND active = 1 ORDER BY name").all()
  return c.json({ services: result.results })
})

app.get('/api/data/customers', async c => {
  const q = (c.req.query('q') || '').trim().slice(0, 80)
  const limit = Math.min(Math.max(Number(c.req.query('limit') || 30), 1), 100)
  const like = '%' + q.replace(/[%_]/g, '') + '%'
  const result = q
    ? await c.env.DB.prepare("SELECT id, name, whatsapp, normalized_whatsapp, first_seen_at, last_visit_at, status FROM customer WHERE branch_id = 'utama' AND status = 'active' AND (name LIKE ? OR whatsapp LIKE ? OR normalized_whatsapp LIKE ?) ORDER BY COALESCE(last_visit_at, first_seen_at, created_at) DESC LIMIT ?").bind(like, like, like, limit).all()
    : await c.env.DB.prepare("SELECT id, name, whatsapp, normalized_whatsapp, first_seen_at, last_visit_at, status FROM customer WHERE branch_id = 'utama' AND status = 'active' ORDER BY COALESCE(last_visit_at, first_seen_at, created_at) DESC LIMIT ?").bind(limit).all()
  return c.json({ customers: result.results })
})

app.get('/api/data/customers/:id', async c => {
  const id = c.req.param('id')
  const customer = await c.env.DB.prepare("SELECT id, name, whatsapp, normalized_whatsapp, first_seen_at, last_visit_at, status, created_at FROM customer WHERE id = ? AND branch_id = 'utama'").bind(id).first()
  if (!customer) return c.json({ error: 'Pelanggan tidak ditemukan.' }, 404)
  const visits = await c.env.DB.prepare("SELECT v.id, v.occurred_at, v.status, v.service_summary, v.source, c.display_name AS capster_name FROM visit v LEFT JOIN capster c ON c.id = v.capster_id WHERE v.customer_id = ? ORDER BY v.occurred_at DESC LIMIT 100").bind(id).all()
  const consent = await c.env.DB.prepare("SELECT channel, purpose, status, captured_at, source, notes FROM customer_consent WHERE customer_id = ? ORDER BY captured_at DESC LIMIT 20").bind(id).all()
  return c.json({ customer, visits: visits.results, consent: consent.results })
})

app.post('/api/data/customers', async c => {
  const actor = principal(c)!
  const body = await c.req.json().catch(() => null)
  const name = cleanOptionalText(body?.name, 80)
  const whatsapp = cleanOptionalText(body?.whatsapp, 32)
  const normalized = whatsapp ? normalizeWhatsapp(whatsapp) : null
  if (!name && !normalized) return c.json({ error: 'Isi nama atau WhatsApp agar pelanggan dapat dikenali.' }, 400)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    await c.env.DB.prepare('INSERT INTO customer (id, branch_id, name, whatsapp, normalized_whatsapp, first_seen_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, 'utama', name, whatsapp, normalized, now, 'active').run()
    await audit(c, actor, 'customer_created', 'customer', id, { name, whatsapp, normalized_whatsapp: normalized })
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return c.json({ error: 'Nomor WhatsApp sudah terdaftar. Cari pelanggan tersebut, jangan buat duplikat.' }, 409)
    throw error
  }
  return c.json({ id, name, whatsapp, normalized_whatsapp: normalized }, 201)
})

app.patch('/api/data/customers/:id', async c => {
  const actor = principal(c)!
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare("SELECT id, name, whatsapp, normalized_whatsapp FROM customer WHERE id = ? AND branch_id = 'utama'").bind(id).first<{ id: string; name: string | null; whatsapp: string | null; normalized_whatsapp: string | null }>()
  if (!existing) return c.json({ error: 'Pelanggan tidak ditemukan.' }, 404)
  const body = await c.req.json().catch(() => null)
  const name = body?.name === undefined ? existing.name : cleanOptionalText(body?.name, 80)
  const whatsapp = body?.whatsapp === undefined ? existing.whatsapp : cleanOptionalText(body?.whatsapp, 32)
  const normalized = whatsapp ? normalizeWhatsapp(whatsapp) : null
  if (!name && !normalized) return c.json({ error: 'Pelanggan harus punya nama atau WhatsApp.' }, 400)
  try {
    await c.env.DB.prepare('UPDATE customer SET name = ?, whatsapp = ?, normalized_whatsapp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = ?').bind(name, whatsapp, normalized, id, 'utama').run()
    await audit(c, actor, 'customer_updated', 'customer', id, { name, whatsapp, normalized_whatsapp: normalized }, existing)
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) return c.json({ error: 'Nomor WhatsApp sudah dipakai pelanggan lain.' }, 409)
    throw error
  }
  return c.json({ ok: true, customer: { id, name, whatsapp, normalized_whatsapp: normalized } })
})

app.get('/api/data/visits/today', async c => {
  const result = await c.env.DB.prepare("SELECT v.id, v.customer_id, v.capster_id, v.occurred_at, v.status, v.service_summary, v.source, c.name AS customer_name, c.whatsapp, cp.display_name AS capster_name FROM visit v LEFT JOIN customer c ON c.id = v.customer_id LEFT JOIN capster cp ON cp.id = v.capster_id WHERE v.branch_id = 'utama' AND date(v.occurred_at, 'localtime') = date('now', 'localtime') ORDER BY v.occurred_at DESC").all()
  return c.json({ visits: result.results })
})

app.post('/api/data/visits', async c => {
  const actor = principal(c)!
  const body = await c.req.json().catch(() => null)
  const customerId = cleanOptionalText(body?.customer_id, 80)
  const capsterId = cleanOptionalText(body?.capster_id, 80)
  const serviceSummary = cleanOptionalText(body?.service_summary, 240)
  const occurredAt = typeof body?.occurred_at === 'string' && body.occurred_at ? body.occurred_at : new Date().toISOString()
  const status = ['expected', 'arrived', 'in_service', 'completed', 'cancelled', 'no_show'].includes(body?.status) ? body.status : 'arrived'
  if (customerId) {
    const found = await c.env.DB.prepare("SELECT id FROM customer WHERE id = ? AND branch_id = 'utama' AND status = 'active'").bind(customerId).first()
    if (!found) return c.json({ error: 'Pelanggan tidak ditemukan.' }, 404)
  }
  if (capsterId) {
    const found = await c.env.DB.prepare("SELECT id FROM capster WHERE id = ? AND branch_id = 'utama' AND status = 'active'").bind(capsterId).first()
    if (!found) return c.json({ error: 'Capster tidak ditemukan.' }, 404)
  }
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO visit (id, branch_id, customer_id, capster_id, occurred_at, status, service_summary, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, 'utama', customerId, capsterId, occurredAt, status, serviceSummary, 'manual').run()
  if (customerId && ['arrived', 'in_service', 'completed'].includes(status)) {
    await c.env.DB.prepare("UPDATE customer SET last_visit_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = 'utama'").bind(occurredAt, customerId).run()
  }
  await audit(c, actor, 'visit_created', 'visit', id, { customer_id: customerId, capster_id: capsterId, occurred_at: occurredAt, status, service_summary: serviceSummary, source: 'manual' })
  return c.json({ id, customer_id: customerId, capster_id: capsterId, occurred_at: occurredAt, status, service_summary: serviceSummary }, 201)
})

app.patch('/api/data/visits/:id/status', async c => {
  const actor = principal(c)!
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const nextStatus = body?.status
  if (!['expected', 'arrived', 'in_service', 'completed', 'cancelled', 'no_show'].includes(nextStatus)) return c.json({ error: 'Status kunjungan tidak valid.' }, 400)
  const existing = await c.env.DB.prepare("SELECT id, customer_id, status, occurred_at FROM visit WHERE id = ? AND branch_id = 'utama'").bind(id).first<{ id: string; customer_id: string | null; status: string; occurred_at: string }>()
  if (!existing) return c.json({ error: 'Kunjungan tidak ditemukan.' }, 404)
  await c.env.DB.prepare("UPDATE visit SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = 'utama'").bind(nextStatus, id).run()
  if (existing.customer_id && ['arrived', 'in_service', 'completed'].includes(nextStatus)) {
    await c.env.DB.prepare("UPDATE customer SET last_visit_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND branch_id = 'utama'").bind(existing.occurred_at, existing.customer_id).run()
  }
  await audit(c, actor, 'visit_status_changed', 'visit', id, { status: nextStatus }, existing)
  return c.json({ ok: true, id, status: nextStatus })
})

app.get('/', c => c.html(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#203b34"><title>Bosku One System</title><link rel="stylesheet" href="/static/style.css"></head><body><header><span class="mark">B.</span><strong>Bosku <span>One System</span></strong><small>Customer + Visit</small></header><main id="app"><p>Memuat...</p></main><footer>Kasir Pro tetap sumber transaksi. Bosku mencatat pelanggan dan kunjungan; transaksi aktual tidak dibuat dari data perkiraan.</footer><script src="/static/app.js" defer></script></body></html>`))

app.get('/favicon.ico', c => c.body(null, 204))
app.all('*', c => c.json({ error: 'Halaman tidak ditemukan.' }, 404))

export default app
