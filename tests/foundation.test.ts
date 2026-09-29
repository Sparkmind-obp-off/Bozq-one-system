import { test } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/index'
import { can, digest, hashPassword, newSessionToken, safeText, verifyPassword } from '../src/security'

test('roles deny operator/capster administration but permit operations', () => {
  assert.equal(can('owner', 'administration'), true)
  assert.equal(can('operator', 'administration'), false)
  assert.equal(can('capster', 'administration'), false)
  assert.equal(can('capster', 'operations'), true)
})

test('password verification uses salted PBKDF2 and rejects malformed hashes', async () => {
  const hash = await hashPassword('a-strong-passphrase')
  assert.notEqual(hash, await hashPassword('a-strong-passphrase'))
  assert.equal(await verifyPassword('a-strong-passphrase', hash), true)
  assert.equal(await verifyPassword('wrong-password', hash), false)
  assert.equal(await verifyPassword('a-strong-passphrase', 'bad'), false)
})

test('session tokens are random and only stored via digest', async () => {
  const token = newSessionToken()
  assert.match(token, /^[0-9a-f]{64}$/)
  assert.notEqual(token, newSessionToken())
  assert.notEqual(token, await digest(token))
})

test('user-provided text is escaped', () => assert.equal(safeText('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;'))

function mockDB(role: 'owner' | 'capster') {
  return {
    prepare(query: string) {
      return {
        bind(..._values: unknown[]) { return this },
        async first() {
          if (query.includes('FROM session')) return { id: 'user-1', display_name: 'Tester', role, business_id: 'bosku' }
          return null
        },
        async all() { return { results: [] } }
      }
    }
  } as unknown as D1Database
}

test('owner API requires authentication and rejects capster server-side', async () => {
  const guest = await app.request('http://localhost/api/owner/audit', {}, { DB: mockDB('owner') })
  assert.equal(guest.status, 401)
  const capster = await app.request('http://localhost/api/owner/audit', { headers: { Cookie: `bosku_session=${newSessionToken()}` } }, { DB: mockDB('capster') })
  assert.equal(capster.status, 403)
  const owner = await app.request('http://localhost/api/owner/audit', { headers: { Cookie: `bosku_session=${newSessionToken()}` } }, { DB: mockDB('owner') })
  assert.equal(owner.status, 200)
})

test('database selector defaults to D1 and rejects missing Neon secret or invalid selector', async () => {
  const url = 'https://bosku-one-system.pages.dev/api/me'
  assert.equal((await app.request(url, {}, { DB: mockDB('owner') })).status, 401)
  const blocked = { prepare() { throw new Error('D1 must not be queried') } } as unknown as D1Database
  const missing = await app.request(url, {}, { DB: blocked, DB_PRIMARY: 'neon' })
  assert.equal(missing.status, 503)
  const invalid = await app.request(url, {}, { DB: blocked, DB_PRIMARY: 'invalid' as 'd1' })
  assert.equal(invalid.status, 503)
})

test('writes from another origin or without origin are rejected', async () => {
  const cross = await app.request('http://localhost/api/logout', { method: 'POST', headers: { Origin: 'https://attacker.test', 'Content-Type': 'application/json' }, body: '{}' }, { DB: mockDB('owner') })
  assert.equal(cross.status, 403)
  const absent = await app.request('http://localhost/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, { DB: mockDB('owner') })
  assert.equal(absent.status, 403)
})
