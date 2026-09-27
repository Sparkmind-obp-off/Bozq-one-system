import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import app from '../src/index'
import { canTransition, localTime, normalizeWhatsapp, projectedTotal } from '../src/operations'
import { parseCsv, detectColumns, normalizeRow } from '../src/import'
import { returnPattern } from '../src/retention'

const origin = 'http://localhost'
function database() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/0001_foundation.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0002_core_operations.sql', import.meta.url), 'utf8'))
  sqlite.exec(readFileSync(new URL('../migrations/0003_import_retention.sql', import.meta.url), 'utf8'))
  const adapter = {
    prepare(sql: string) {
      let args: any[] = []
      const stmt = sqlite.prepare(sql)
      const handle = {
        bind(...values: any[]) { args = values; return handle },
        async first() { return stmt.get(...args) ?? null },
        async all() { return { results: stmt.all(...args) } },
        async run() { const result = stmt.run(...args); return { meta: { changes: Number(result.changes) } } }
      }
      return handle
    },
    async batch(statements: any[]) {
      sqlite.exec('BEGIN')
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results }
      catch (error) { sqlite.exec('ROLLBACK'); throw error }
    }
  }
  return { sqlite, DB: adapter as unknown as D1Database }
}

function client(DB: D1Database) {
  let cookie = ''
  return {
    async call(path: string, method = 'GET', payload?: unknown) {
      const response = await app.request(`${origin}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }, { DB })
      const setCookie = response.headers.get('Set-Cookie')
      if (setCookie) cookie = setCookie.split(';')[0]
      return { code: response.status, data: await response.json() as any }
    }
  }
}
const guid = () => crypto.randomUUID()

test('normalization, state transitions, dates, and projection are conservative', () => {
  assert.equal(normalizeWhatsapp('0812 3456 7890'), '+6281234567890')
  assert.equal(normalizeWhatsapp('+62-812-3456-7890'), '+6281234567890')
  assert.equal(normalizeWhatsapp(''), null)
  assert.throws(() => normalizeWhatsapp('123abc'))
  assert.throws(() => localTime('2026-02-30T12:30'))
  assert.equal(canTransition('booking', 'confirmed', 'arrived'), true)
  assert.equal(canTransition('booking', 'confirmed', 'completed'), false)
  assert.equal(canTransition('visit', 'completed', 'arrived'), false)
  assert.equal(projectedTotal([20000, 10000]), 30000)
  assert.equal(projectedTotal([20000, null]), null)
})

test('Phase 2 API: no-token setup, owner permissions, customers, walk-in, booking, Today, audit', async () => {
  const { DB, sqlite } = database()
  const owner = client(DB)
  const fresh = await owner.call('/api/bootstrap', 'POST', { username: 'boskuowner', name: 'Pemilik Bosku', password: 'UniqueOwnerPassword123!' })
  assert.equal(fresh.code, 201)
  assert.equal((await owner.call('/api/bootstrap', 'POST', { username: 'other', name: 'Other', password: 'AnotherPassphrase123!' })).code, 409)
  const capsterId = guid()
  assert.equal((await owner.call('/api/owner/capsters', 'POST', { id: capsterId, name: 'Capster A' })).code, 201)
  assert.equal((await owner.call('/api/owner/capsters', 'POST', { id: capsterId, name: 'Capster A' })).data.repeated, true)
  const capster = (await owner.call('/api/capsters')).data.capsters[0]
  assert.equal(capster.status, 'active')
  const serviceId = guid()
  const service = (await owner.call('/api/owner/services', 'POST', { id: serviceId, name: 'Potong', price: 20000 })).data
  assert.equal(service.price, 20000)
  assert.equal((await owner.call('/api/owner/services', 'POST', { id: serviceId, name: 'Potong', price: 20000 })).data.repeated, true)
  const staffCreated = await owner.call('/api/owner/users', 'POST', { username: 'staff', name: 'Staf Toko', password: 'UniqueStaffPassword123!', role: 'operator' })
  assert.equal(staffCreated.code, 201)
  const operator = client(DB)
  assert.equal((await operator.call('/api/login', 'POST', { username: 'staff', password: 'UniqueStaffPassword123!' })).code, 200)
  assert.equal((await operator.call('/api/owner/capsters', 'POST', { name: 'Blocked' })).code, 403)
  assert.equal((await operator.call('/api/owner/services', 'POST', { name: 'Blocked' })).code, 403)
  assert.equal((await operator.call('/api/services')).data.services.length, 1)

  const firstId = guid(), secondId = guid()
  const first = await operator.call('/api/customers', 'POST', { id: firstId, name: 'Nama Sama', whatsapp: '081234567890' })
  assert.equal(first.code, 201)
  assert.equal((await operator.call('/api/customers', 'POST', { id: firstId, name: 'Nama Sama', whatsapp: '081234567890' })).data.repeated, true)
  assert.equal((await operator.call('/api/customers', 'POST', { id: guid(), name: 'Lain', whatsapp: '+6281234567890' })).code, 409)
  assert.equal((await operator.call('/api/customers', 'POST', { id: guid(), name: 'Invalid', whatsapp: 'not-a-phone' })).code, 400)
  assert.equal((await operator.call('/api/visits', 'POST', null)).code, 400)
  assert.equal((await operator.call('/api/customers', 'POST', { id: secondId, name: 'Nama Sama' })).code, 201)
  assert.equal((await operator.call('/api/customers?q=Nama%20Sama')).data.customers.length, 2)
  assert.equal((await operator.call(`/api/customers/${firstId}`)).data.completed_visits, 0)

  const walkId = guid()
  const walk = await operator.call('/api/visits', 'POST', { id: walkId, customer_id: firstId, capster_id: capster.id, service_id: service.id })
  assert.equal(walk.code, 201)
  assert.equal(walk.data.status, 'arrived')
  assert.equal((await operator.call('/api/visits', 'POST', { id: walkId, customer_id: firstId, capster_id: capster.id, service_id: service.id })).data.repeated, true)
  assert.equal((await operator.call(`/api/visits/${walkId}/status`, 'PATCH', { status: 'completed' })).code, 409)
  assert.equal((await operator.call(`/api/visits/${walkId}/status`, 'PATCH', { status: 'in_service' })).code, 200)
  assert.equal((await operator.call(`/api/visits/${walkId}/status`, 'PATCH', { status: 'completed' })).code, 200)
  assert.equal((await operator.call(`/api/customers/${firstId}`)).data.completed_visits, 1)
  assert.ok((await operator.call(`/api/customers/${firstId}`)).data.customer.last_visit_at)
  const anonymousId = guid()
  assert.equal((await operator.call('/api/visits', 'POST', { id: anonymousId })).code, 201)
  assert.equal((await operator.call(`/api/visits/${anonymousId}/status`, 'PATCH', { status: 'in_service' })).code, 200)
  assert.equal((await operator.call(`/api/visits/${anonymousId}/status`, 'PATCH', { status: 'completed' })).code, 200)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM booking WHERE id = ?').get(walkId)?.n, 0)

  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const bookedId = guid()
  const payload = { id: bookedId, customer_id: firstId, scheduled_start: `${date}T15:00`, capster_id: capster.id, people: [{ service_id: service.id }, { customer_id: secondId, service_id: service.id }] }
  const booked = await operator.call('/api/bookings', 'POST', payload)
  assert.equal(booked.code, 201)
  assert.equal(booked.data.projected_value, 40000)
  assert.equal(booked.data.actual_value, null)
  assert.equal((await operator.call('/api/bookings', 'POST', payload)).data.repeated, true)
  const before = (await operator.call('/api/today')).data
  assert.equal(before.counts.confirmed, 2)
  assert.equal(before.projected_value, 40000)
  assert.equal(before.actual_value, null)
  assert.equal((await operator.call(`/api/bookings/${bookedId}/status`, 'PATCH', { status: 'completed' })).code, 409)
  assert.equal((await operator.call(`/api/bookings/${bookedId}/status`, 'PATCH', { status: 'arrived' })).code, 200)
  assert.equal((await operator.call(`/api/bookings/${bookedId}/status`, 'PATCH', { status: 'arrived' })).data.repeated, true)
  assert.equal((await operator.call(`/api/bookings/${bookedId}`)).data.people.length, 2)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM visit WHERE booking_id = ?').get(bookedId)?.n, 2)
  assert.equal((await operator.call(`/api/bookings/${bookedId}/status`, 'PATCH', { status: 'in_service' })).code, 200)
  assert.equal((await operator.call(`/api/bookings/${bookedId}/status`, 'PATCH', { status: 'completed' })).code, 200)
  assert.equal((await operator.call(`/api/customers/${firstId}`)).data.completed_visits, 2)
  assert.equal((await operator.call(`/api/customers/${secondId}`)).data.completed_visits, 1)
  assert.equal((await operator.call('/api/today')).data.actual_value, null)
  assert.equal((await operator.call('/api/today')).data.projected_value, 0)

  const cancelId = guid(), absentId = guid()
  assert.equal((await operator.call('/api/bookings', 'POST', { ...payload, id: cancelId })).code, 201)
  assert.equal((await operator.call(`/api/bookings/${cancelId}/status`, 'PATCH', { status: 'cancelled' })).code, 200)
  assert.equal((await operator.call('/api/bookings', 'POST', { ...payload, id: absentId })).code, 201)
  assert.equal((await operator.call(`/api/bookings/${absentId}/status`, 'PATCH', { status: 'no_show' })).code, 200)
  assert.equal((await operator.call('/api/today')).data.actual_value, null)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM visit WHERE booking_id IN (?, ?)').get(cancelId, absentId)?.n, 0)
  assert.equal((await operator.call('/api/bookings', 'POST', { ...payload, id: guid(), people: [{ service_id: null }] })).data.projected_value, null)
  assert.equal((await operator.call('/api/today')).data.projection_incomplete, true)

  assert.equal((await owner.call(`/api/owner/capsters/${capster.id}`, 'PATCH', { status: 'inactive' })).code, 200)
  assert.equal((await operator.call('/api/capsters')).data.capsters.length, 0)
  assert.equal((await operator.call('/api/visits', 'POST', { id: guid(), capster_id: capster.id })).code, 400)
  assert.equal((await owner.call(`/api/owner/services/${service.id}`, 'PATCH', { active: 0 })).code, 200)
  assert.equal((await operator.call('/api/services')).data.services.length, 0)
  assert.equal((await operator.call('/api/visits', 'POST', { id: guid(), service_id: service.id })).code, 400)
  assert.equal((await owner.call(`/api/owner/capsters/${capster.id}`, 'PATCH', { status: 'active' })).code, 200)
  assert.equal((await operator.call('/api/capsters')).data.capsters.length, 1)
  assert.equal((await owner.call(`/api/owner/services/${service.id}`, 'PATCH', { active: 1, price: 25000 })).code, 200)
  assert.equal((await operator.call('/api/services')).data.services[0].price, 25000)
  assert.equal((await operator.call(`/api/bookings/${bookedId}`)).data.booking.projected_value, 40000)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM price_rule WHERE service_id = ?').get(service.id)?.n, 2)
  assert.equal((await owner.call('/api/owner/audit')).data.events.some((event: any) => event.action === 'service_updated'), true)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM transaction_snapshot').get()?.n, 0)
  sqlite.close()
})

test('CSV parser, normalization and return intervals use observed evidence only', () => {
  const rows = parseCsv('ID Transaksi;Tanggal;Total;Nama Pelanggan;Layanan\nX1;2026-09-13 12:30;Rp 25.000;"Budi, A";Potong\n')
  const columns = detectColumns(rows[0])
  assert.equal(normalizeRow(rows[1], columns, 2).gross_amount, 25000)
  assert.equal(normalizeRow(rows[1], columns, 2).customer_name, 'Budi, A')
  assert.throws(() => normalizeRow(['X1', '2026-09-13', '25,000', 'Budi', 'Potong'], columns, 2))
  assert.throws(() => parseCsv('Tanggal,Total\n"bad,10\n'))
  assert.equal(returnPattern([], '2026-09-27').state, 'unknown')
  assert.equal(returnPattern(['2026-09-01'], '2026-09-27').state, 'insufficient_history')
  const pattern = returnPattern(['2026-08-01', '2026-08-22', '2026-09-13'], '2026-10-03')
  assert.deepEqual(pattern.observed_intervals_days, [21, 22])
  assert.equal(pattern.observed_interval_days, 21.5)
  assert.equal(pattern.state, 'due')
  assert.equal(pattern.window_start, '2026-09-29')
})

test('Phase 3: owner-only dry run, idempotent import, conservative match, consent, handoff and actual separation', async () => {
  const { DB, sqlite } = database(); const owner = client(DB); const outsider = client(DB)
  assert.equal((await outsider.call('/api/returns')).code, 401)
  assert.equal((await outsider.call('/api/owner/import/runs')).code, 401)
  assert.equal((await owner.call('/api/bootstrap', 'POST', { username: 'owner3', name: 'Pemilik', password: 'LongUniquePassword2026!' })).code, 201)
  const customerId = guid(), unknownId = guid()
  assert.equal((await owner.call('/api/customers', 'POST', { id: customerId, name: 'Budi', whatsapp: '081234567890' })).code, 201)
  assert.equal((await owner.call('/api/customers', 'POST', { id: unknownId, name: 'Budi' })).code, 201)
  const agent = client(DB)
  assert.equal((await owner.call('/api/owner/users', 'POST', { username: 'operator3', name: 'Operator', password: 'LongUniquePassword2026!', role: 'operator' })).code, 201)
  assert.equal((await agent.call('/api/login', 'POST', { username: 'operator3', password: 'LongUniquePassword2026!' })).code, 200)
  const csv = 'ID Transaksi,Tanggal,Total,Nama Pelanggan,Whatsapp,Layanan,Metode Pembayaran\nA1,2026-09-27 09:00,25000,Budi,081234567890,Potong,Tunai\nA2,2026-09-27 09:30,30000,Budi,,Potong,QRIS\n'
  assert.equal((await agent.call('/api/owner/import/preview', 'POST', { csv })).code, 403)
  const dry = await owner.call('/api/owner/import/preview', 'POST', { csv })
  assert.equal(dry.code, 200); assert.equal(dry.data.rows_valid_new, 2); assert.equal(dry.data.unlinked, 1)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM transaction_snapshot').get()?.n, 0)
  assert.equal((await owner.call('/api/owner/import/commit', 'POST', { csv, confirm_file_id: 'wrong' })).code, 409)
  const done = await owner.call('/api/owner/import/commit', 'POST', { csv, confirm_file_id: dry.data.file_id })
  assert.equal(done.code, 200); assert.equal(done.data.imported, 2)
  assert.equal(sqlite.prepare("SELECT customer_id FROM transaction_snapshot WHERE external_transaction_id = 'A1'").get()?.customer_id, customerId)
  assert.equal(sqlite.prepare("SELECT customer_id FROM transaction_snapshot WHERE external_transaction_id = 'A2'").get()?.customer_id, null)
  assert.equal((await owner.call('/api/today?date=2026-09-27')).data.actual_value, 55000)
  const repeat = await owner.call('/api/owner/import/commit', 'POST', { csv, confirm_file_id: dry.data.file_id })
  assert.equal(repeat.data.imported, 0); assert.equal(repeat.data.skipped, 2)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM transaction_snapshot').get()?.n, 2)
  const altered = csv.replace('25000', '26000')
  const conflict = await owner.call('/api/owner/import/preview', 'POST', { csv: altered })
  assert.deepEqual(conflict.data.conflicts, [2])
  assert.equal((await owner.call('/api/owner/import/commit', 'POST', { csv: altered, confirm_file_id: conflict.data.file_id })).code, 409)
  assert.equal(sqlite.prepare("SELECT gross_amount FROM transaction_snapshot WHERE external_transaction_id = 'A1'").get()?.gross_amount, 25000)
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const day = (offset: number) => new Date(Date.parse(date + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10)
  for (const offset of [-42, -21, 0]) sqlite.prepare("INSERT INTO visit (id, branch_id, customer_id, occurred_at, status, source) VALUES (?, 'utama', ?, ?, 'completed', 'walk_in')").run(guid(), customerId, `${day(offset)}T09:00`)
  const opportunity = (await agent.call(`/api/returns/${customerId}`)).data
  assert.equal(opportunity.return_opportunity.observed_interval_days, 21)
  assert.equal((await agent.call(`/api/returns/${unknownId}`)).data.return_opportunity.state, 'unknown')
  assert.equal(opportunity.consent_status, 'unknown')
  assert.equal((await agent.call('/api/reminders/prepare', 'POST', { customer_id: customerId })).code, 409)
  // Move last visit back into observed return window for due eligibility.
  sqlite.prepare("UPDATE visit SET occurred_at = ? WHERE customer_id = ? AND occurred_at = ?").run(`${day(-21)}T09:00`, customerId, `${day(0)}T09:00`)
  // Duplicate calendar dates mean insufficient history; restore three distinct historical dates.
  sqlite.prepare("UPDATE visit SET occurred_at = ? WHERE customer_id = ? AND occurred_at = ? AND id = (SELECT id FROM visit WHERE customer_id = ? AND occurred_at = ? LIMIT 1)").run(`${day(-63)}T09:00`, customerId, `${day(-21)}T09:00`, customerId, `${day(-21)}T09:00`)
  assert.equal((await agent.call('/api/returns')).data.customers.find((c: any) => c.id === customerId).state, 'due')
  assert.equal((await agent.call('/api/reminders/prepare', 'POST', { customer_id: customerId })).code, 403)
  assert.equal((await agent.call(`/api/customers/${customerId}/consent`, 'POST', { status: 'yes', source: 'historical_whatsapp', notes: 'Tidak ada bukti' })).code, 400)
  assert.equal((await agent.call(`/api/customers/${customerId}/consent`, 'POST', { status: 'yes', source: 'customer_explicit', notes: 'Setuju secara langsung saat kunjungan' })).code, 201)
  const prepared = await agent.call('/api/reminders/prepare', 'POST', { customer_id: customerId })
  assert.equal(prepared.code, 201)
  assert.equal((await agent.call('/api/reminders/prepare', 'POST', { customer_id: customerId })).data.repeated, true)
  assert.equal((await agent.call(`/api/reminders/${prepared.data.id}/handoff`, 'POST', {})).data.url.startsWith('https://wa.me/6281234567890?text='), true)
  assert.equal(sqlite.prepare('SELECT sent_at FROM reminder WHERE id = ?').get(prepared.data.id)?.sent_at, null)
  assert.equal((await agent.call(`/api/customers/${customerId}/consent`, 'POST', { status: 'no', source: 'customer_explicit', notes: 'Mencabut izin secara langsung' })).code, 201)
  assert.equal((await agent.call(`/api/reminders/${prepared.data.id}/handoff`, 'POST', {})).code, 403)
  assert.equal((await owner.call('/api/owner/audit')).data.events.some((event: any) => event.action === 'transaction_imported'), true)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reminder_event').get()?.n, 2)
  assert.equal((await owner.call('/api/me/password', 'POST', { current_password: 'wrong', new_password: 'AnotherUniquePassword2026!' })).code, 403)
  assert.equal((await owner.call('/api/me/password', 'POST', { current_password: 'LongUniquePassword2026!', new_password: 'AnotherUniquePassword2026!' })).code, 200)
  assert.equal((await owner.call('/api/me')).code, 401)
  assert.equal((await owner.call('/api/login', 'POST', { username: 'owner3', password: 'LongUniquePassword2026!' })).code, 401)
  assert.equal((await owner.call('/api/login', 'POST', { username: 'owner3', password: 'AnotherUniquePassword2026!' })).code, 200)
  sqlite.close()
})
