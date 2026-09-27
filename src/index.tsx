import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import operations from './routes'
import phase3 from './phase3'
import { InputError } from './operations'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { can, digest, hashPassword, newSessionToken, verifyPassword, type Role } from './security'

export type Bindings = { DB: D1Database; BOOTSTRAP_TOKEN?: string }
export type Principal = { id: string; display_name: string; role: Role; business_id: string }
export type Variables = { principal: Principal }
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
const cookieName = 'bosku_session'
const sessionSeconds = 60 * 60 * 24 * 7

app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status)
  if (error instanceof InputError) return c.json({ error: error.message }, 400)
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
  const configured = c.env.BOOTSTRAP_TOKEN
  const url = new URL(c.req.url)
  // No manual token for local development; production setup stays secret-gated.
  const localOnly = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && !c.req.header('X-Forwarded-For')
  if (!localOnly && (!configured || configured.length < 32 || c.req.header('X-Bootstrap-Token') !== configured)) return c.json({ error: 'Inisialisasi hanya tersedia lokal atau dengan otorisasi produksi.' }, 403)
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

app.post('/api/me/password', async c => {
  const user = principal(c)
  if (!user) return c.json({ error: 'Silakan masuk.' }, 401)
  const input = await c.req.json().catch(() => null)
  if (typeof input?.current_password !== 'string' || typeof input?.new_password !== 'string' || input.new_password.length < 12 || input.new_password.length > 128 || input.current_password === input.new_password) return c.json({ error: 'Sandi baru harus berbeda dan berisi 12–128 karakter.' }, 400)
  const account = await c.env.DB.prepare('SELECT password_hash FROM app_user WHERE id = ? AND status = ?').bind(user.id, 'active').first<{ password_hash: string }>()
  if (!account || !await verifyPassword(input.current_password, account.password_hash)) return c.json({ error: 'Sandi sekarang tidak sesuai.' }, 403)
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE app_user SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(await hashPassword(input.new_password), user.id),
    c.env.DB.prepare('DELETE FROM session WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('INSERT INTO audit_event (id, branch_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), 'utama', user.id, 'password_changed', 'app_user', user.id)
  ])
  deleteCookie(c, cookieName, { path: '/' })
  return c.json({ ok: true, note: 'Sandi diganti. Masuk lagi.' })
})

app.get('/api/owner/overview', async c => {
  const counts = await c.env.DB.prepare('SELECT (SELECT count(*) FROM customer) AS customers, (SELECT count(*) FROM visit) AS visits, (SELECT count(*) FROM booking) AS bookings, (SELECT count(*) FROM transaction_snapshot) AS transactions').first()
  return c.json({ counts, note: 'Aktual hanya berasal dari snapshot impor CSV Kasir Pro; kunjungan dan booking bukan pembayaran.' })
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

app.route('/api', operations)
app.route('/api', phase3)

app.get('/', c => c.html(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#203b34"><title>Bosku One System</title><link rel="stylesheet" href="/static/style.css"></head><body><header><span class="mark">B.</span><strong>Bosku <span>One System</span></strong><small>Fondasi operasional</small></header><main id="app"><p>Memuat...</p></main><footer>Kasir Pro tetap sumber transaksi. Tidak ada angka perkiraan yang dianggap pendapatan aktual.</footer><script src="/static/app.js" defer></script></body></html>`))

app.get('/favicon.ico', c => c.body(null, 204))
app.all('*', c => c.json({ error: 'Halaman tidak ditemukan.' }, 404))

export default app
