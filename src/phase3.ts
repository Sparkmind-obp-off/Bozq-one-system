import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings, Principal, Variables } from './index'
import { digest } from './security'
import { parseCsv, detectColumns, normalizeRow, type ImportRow } from './import'
import { returnPattern } from './retention'
import { localDate, validId } from './operations'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const branch = 'utama'
const fail = (message: string, code: 400 | 403 | 404 | 409 = 400): never => { throw new HTTPException(code, { message }) }
const actor = (c: any): Principal => c.get('principal')
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
async function input(c: any) { const data = await c.req.json().catch(() => null); if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Kirim objek JSON.'); return data }
function audit(db: D1Database, user: string, action: string, entity: string, id: string, after: unknown, before: unknown = null) {
  return db.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id, before_snapshot, after_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), branch, user, action, entity, id, before ? JSON.stringify(before) : null, JSON.stringify(after))
}
app.use('*', async (c, next) => { if (!actor(c)) return c.json({ error: 'Silakan masuk.' }, 401); await next() })
app.use('/owner/*', async (c, next) => { if (actor(c).role !== 'owner') return c.json({ error: 'Hanya pemilik.' }, 403); await next() })

async function inspect(db: D1Database, csv: string, mapping?: Record<string, string>) {
  const rows = parseCsv(csv), headers = rows[0], columns = detectColumns(headers, mapping)
  const fileHash = await digest(csv.replace(/^\uFEFF/, ''))
  const output: ImportRow[] = [], errors: { row: number; error: string }[] = [], seen = new Map<string, string>()
  const customerMatches: Record<number, string | null> = {}, duplicates: number[] = [], conflicts: number[] = []
  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1
    try {
      const parsed = normalizeRow(rows[i], columns, rowNumber)
      const fingerprint = await digest(parsed.external_transaction_id ? JSON.stringify({ ...parsed, row_number: undefined }) : `${fileHash}:${rowNumber}`)
      const record = { ...parsed, fingerprint }
      const key = parsed.external_transaction_id ? `external:${parsed.external_transaction_id}` : `row:${fingerprint}`
      const sameFile = seen.get(key)
      if (sameFile) { if (sameFile === fingerprint) duplicates.push(rowNumber); else conflicts.push(rowNumber); continue }
      seen.set(key, fingerprint)
      const existing = parsed.external_transaction_id
        ? await db.prepare('SELECT raw_fingerprint FROM transaction_snapshot WHERE branch_id = ? AND source_system = ? AND external_transaction_id = ?').bind(branch, 'kasir_pro', parsed.external_transaction_id).first<{ raw_fingerprint: string }>()
        : await db.prepare('SELECT raw_fingerprint FROM transaction_snapshot WHERE branch_id = ? AND source_system = ? AND raw_fingerprint = ?').bind(branch, 'kasir_pro', fingerprint).first<{ raw_fingerprint: string }>()
      if (existing) { (existing.raw_fingerprint === fingerprint ? duplicates : conflicts).push(rowNumber); continue }
      let match: string | null = null
      if (parsed.customer_whatsapp) {
        const found = await db.prepare("SELECT id FROM customer WHERE branch_id = ? AND normalized_whatsapp = ? AND status = 'active'").bind(branch, parsed.customer_whatsapp).first<{ id: string }>()
        match = found?.id || null
      }
      customerMatches[rowNumber] = match
      output.push(record)
    } catch (error) { errors.push({ row: rowNumber, error: error instanceof Error ? error.message : 'Baris tidak valid.' }) }
  }
  return { headers, columns, unmapped: headers.filter((_, i) => !Object.values(columns).includes(i)), file_id: fileHash, rows_seen: rows.length - 1, rows_valid_new: output.length, rows_duplicate: duplicates.length, duplicate_rows: duplicates, conflicts, errors, unlinked: output.filter(r => !customerMatches[r.row_number]).length, observed_total: output.reduce((sum, r) => sum + r.gross_amount, 0), records: output, customerMatches }
}
app.post('/owner/import/preview', async c => {
  const data = await input(c)
  const report = await inspect(c.env.DB, data.csv, data.mapping)
  const { records, customerMatches, ...summary } = report
  return c.json({ ...summary, preview_rows: records.slice(0, 30).map(row => ({ row: row.row_number, transaction_id: row.external_transaction_id, date: row.transaction_time, amount: row.gross_amount, customer: row.customer_name, linked: !!customerMatches[row.row_number] })), note: 'Pratinjau saja; tidak ada data tersimpan. Periksa kolom, nilai, dan pelanggan sebelum impor.' })
})
app.post('/owner/import/commit', async c => {
  const data = await input(c)
  const report = await inspect(c.env.DB, data.csv, data.mapping)
  if (data.confirm_file_id !== report.file_id) fail('Pratinjau ulang berkas sebelum menyimpan.', 409)
  if (report.errors.length || report.conflicts.length) fail('Perbaiki baris tidak valid/konflik sebelum impor.', 409)
  // One atomic D1 batch; no writes occur when a row fails. Unique indexes guard concurrent imports.
  const runId = crypto.randomUUID(), user = actor(c).id
  const statements = [c.env.DB.prepare("INSERT INTO sync_run (id, branch_id, source_system, source_type, status, completed_at, rows_seen, rows_imported, rows_skipped, rows_rejected, created_by) VALUES (?, ?, 'kasir_pro', 'csv', 'completed', CURRENT_TIMESTAMP, ?, ?, ?, 0, ?)").bind(runId, branch, report.rows_seen, report.records.length, report.rows_duplicate, user)]
  for (const row of report.records) statements.push(c.env.DB.prepare("INSERT INTO transaction_snapshot (id, branch_id, sync_run_id, external_transaction_id, transaction_time, gross_amount, payment_method, service_text, source_system, source_file_id, source_row_number, raw_fingerprint, reconciliation_status, customer_id, customer_name, customer_whatsapp, reference_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'kasir_pro', ?, ?, ?, 'unresolved', ?, ?, ?, ?)").bind(crypto.randomUUID(), branch, runId, row.external_transaction_id, row.transaction_time, row.gross_amount, row.payment_method, row.service_text, report.file_id, row.row_number, row.fingerprint, report.customerMatches[row.row_number], row.customer_name, row.customer_whatsapp, row.reference_text))
  statements.push(audit(c.env.DB, user, 'transaction_imported', 'sync_run', runId, { file_id: report.file_id, seen: report.rows_seen, imported: report.records.length, skipped: report.rows_duplicate }))
  try { await c.env.DB.batch(statements) } catch { fail('Impor gagal atau ada impor bersamaan. Pratinjau ulang; data sebelumnya tidak dihapus.', 409) }
  return c.json({ run_id: runId, imported: report.records.length, skipped: report.rows_duplicate, unlinked: report.unlinked, observed_total_new: report.observed_total })
})
app.get('/owner/import/runs', async c => {
  const rows = await c.env.DB.prepare("SELECT id, started_at, status, rows_seen, rows_imported, rows_skipped, rows_rejected FROM sync_run WHERE branch_id = ? AND source_system = 'kasir_pro' ORDER BY started_at DESC LIMIT 20").bind(branch).all()
  return c.json({ runs: rows.results })
})

async function consent(db: D1Database, id: string): Promise<'yes' | 'no' | 'unknown'> {
  const row = await db.prepare("SELECT status FROM customer_consent WHERE customer_id = ? AND channel = 'whatsapp' AND purpose = 'reminder' ORDER BY captured_at DESC, rowid DESC LIMIT 1").bind(id).first<{ status: 'yes' | 'no' | 'unknown' }>()
  return row?.status ?? 'unknown'
}
async function pattern(db: D1Database, id: string, date: string) {
  const history = await db.prepare("SELECT occurred_at FROM visit WHERE branch_id = ? AND customer_id = ? AND status = 'completed' AND substr(occurred_at, 1, 10) <= ? ORDER BY occurred_at DESC LIMIT 101").bind(branch, id, date).all<{ occurred_at: string }>()
  return returnPattern(history.results.map(v => v.occurred_at), date)
}
app.get('/returns', async c => {
  const date = localDate(c.req.query('date') ?? today())
  const rows = await c.env.DB.prepare("SELECT id, name, whatsapp FROM customer WHERE branch_id = ? AND status = 'active' ORDER BY last_visit_at DESC LIMIT 100").bind(branch).all<{ id: string; name: string | null; whatsapp: string | null }>()
  const customers = await Promise.all(rows.results.map(async customer => ({ ...customer, ...(await pattern(c.env.DB, customer.id, date)), consent_status: await consent(c.env.DB, customer.id) })))
  return c.json({ date, customers, note: 'Estimasi dari hari kunjungan selesai; bukan jaminan pelanggan akan datang.' })
})
app.get('/returns/:id', async c => {
  const id = c.req.param('id'); if (!validId(id)) fail('ID tidak valid.')
  const customer = await c.env.DB.prepare("SELECT id, name, whatsapp FROM customer WHERE id = ? AND branch_id = ? AND status = 'active'").bind(id, branch).first()
  if (!customer) fail('Pelanggan tidak ditemukan.', 404)
  return c.json({ customer, return_opportunity: await pattern(c.env.DB, id, today()), consent_status: await consent(c.env.DB, id) })
})
app.post('/customers/:id/consent', async c => {
  const id = c.req.param('id'); if (!validId(id)) fail('ID tidak valid.')
  const data = await input(c)
  if (!['yes', 'no', 'unknown'].includes(data.status) || data.source !== 'customer_explicit' || typeof data.notes !== 'string' || data.notes.trim().length < 3 || data.notes.length > 300) fail('Catat status, sumber persetujuan langsung, dan catatan bukti singkat.')
  const customer = await c.env.DB.prepare('SELECT id FROM customer WHERE id = ? AND branch_id = ? AND status = ?').bind(id, branch, 'active').first()
  if (!customer) fail('Pelanggan tidak ditemukan.', 404)
  const before = await consent(c.env.DB, id), consentId = crypto.randomUUID()
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO customer_consent (id, customer_id, channel, purpose, status, captured_by, source, notes) VALUES (?, ?, 'whatsapp', 'reminder', ?, ?, ?, ?)").bind(consentId, id, data.status, actor(c).id, data.source, data.notes.trim()),
    audit(c.env.DB, actor(c).id, 'consent_recorded', 'customer_consent', consentId, { customer_id: id, status: data.status, source: data.source, notes: data.notes.trim() }, { status: before })
  ])
  return c.json({ id: consentId, status: data.status }, 201)
})
app.post('/reminders/prepare', async c => {
  const data = await input(c), id = data.customer_id
  if (!validId(id)) fail('ID pelanggan tidak valid.')
  const customer = await c.env.DB.prepare("SELECT id, name, whatsapp FROM customer WHERE id = ? AND branch_id = ? AND status = 'active'").bind(id, branch).first<{ id: string; name: string | null; whatsapp: string | null }>()
  if (!customer) throw new HTTPException(404, { message: 'Pelanggan tidak ditemukan.' })
  const state = await pattern(c.env.DB, id, today()), permission = await consent(c.env.DB, id)
  if (!['due', 'overdue'].includes(state.state) || !state.window_start || !state.last_visit) fail('Pelanggan belum masuk rentang pengingat.', 409)
  if (permission !== 'yes' || !customer.whatsapp) fail('Perlu persetujuan WhatsApp eksplisit dan nomor yang valid.', 403)
  const message = `Halo ${customer.name || 'Kak'}, sudah masuk rentang kunjungan berdasarkan riwayat sebelumnya. Kalau ingin rapikan rambut lagi di Bosku, kabari kami ya. Terima kasih!`
  const existing = await c.env.DB.prepare("SELECT id, message_draft FROM reminder WHERE branch_id = ? AND customer_id = ? AND due_at = ? AND channel = 'whatsapp'").bind(branch, id, state.window_start).first<{ id: string; message_draft: string }>()
  if (existing) return c.json({ id: existing.id, message: existing.message_draft, repeated: true, note: 'Pesan disiapkan; belum dikirim.' })
  const reminderId = crypto.randomUUID()
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO reminder (id, branch_id, customer_id, due_at, eligibility_status, consent_status, channel, message_draft) VALUES (?, ?, ?, ?, 'prepared', 'yes', 'whatsapp', ?)").bind(reminderId, branch, id, state.window_start, message),
    c.env.DB.prepare("INSERT INTO reminder_event (id, reminder_id, event_type, actor_user_id, metadata) VALUES (?, ?, 'prepared', ?, ?)").bind(crypto.randomUUID(), reminderId, actor(c).id, JSON.stringify({ evidence_dates: state.evidence_dates, observed_intervals_days: state.observed_intervals_days, window_end: state.window_end })),
    audit(c.env.DB, actor(c).id, 'reminder_prepared', 'reminder', reminderId, { customer_id: id, evidence_dates: state.evidence_dates, due_at: state.window_start })
  ])
  return c.json({ id: reminderId, message, note: 'Pesan disiapkan; belum dikirim.' }, 201)
})
app.post('/reminders/:id/handoff', async c => {
  const id = c.req.param('id'); if (!validId(id)) fail('ID tidak valid.')
  const row = await c.env.DB.prepare("SELECT r.customer_id, r.message_draft, c.whatsapp FROM reminder r JOIN customer c ON c.id = r.customer_id WHERE r.id = ? AND r.branch_id = ? AND r.eligibility_status = 'prepared' AND c.status = 'active'").bind(id, branch).first<{ customer_id: string; message_draft: string; whatsapp: string | null }>()
  if (!row) throw new HTTPException(404, { message: 'Pengingat tidak ditemukan.' })
  if (await consent(c.env.DB, row.customer_id) !== 'yes' || !row.whatsapp) throw new HTTPException(403, { message: 'Persetujuan saat ini tidak mengizinkan handoff.' })
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO reminder_event (id, reminder_id, event_type, actor_user_id) VALUES (?, ?, 'handoff_opened', ?)").bind(crypto.randomUUID(), id, actor(c).id),
    audit(c.env.DB, actor(c).id, 'reminder_handoff_opened', 'reminder', id, { customer_id: row.customer_id, sent: false })
  ])
  return c.json({ url: `https://wa.me/${row.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(row.message_draft)}`, note: 'WhatsApp dibuka saja; pengguna harus menekan Kirim sendiri.' })
})
export default app
