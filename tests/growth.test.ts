import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lifecycle } from '../src/growth'
import { returnPattern } from '../src/retention'
import { Hono } from 'hono'
import growth from '../src/growth'

test('lifecycle uses configurable thresholds and observed completed days', () => {
  assert.equal(lifecycle(0, null, 45, 90), 'NEW')
  assert.equal(lifecycle(1, 3, 45, 90), 'ACTIVE')
  assert.equal(lifecycle(2, 10, 45, 90), 'RETURNING')
  assert.equal(lifecycle(4, 10, 45, 90), 'LOYAL')
  assert.equal(lifecycle(4, 45, 45, 90), 'AT_RISK')
  assert.equal(lifecycle(5, 90, 45, 90), 'INACTIVE')
  assert.equal(lifecycle(1, 20, 14, 30), 'AT_RISK')
})
test('Growth routes require a principal and Neon, and owner controls configuration', async () => {
  const api = new Hono<any>()
  api.use('*', async (c, next) => { if (c.req.header('X-Test-Role')) c.set('principal', { id: 'test', role: c.req.header('X-Test-Role'), business_id: 'bosku' }); await next() })
  api.route('/api', growth)
  const db = { prepare() { throw new Error('authorization must precede database access') } } as unknown as D1Database
  const url = 'https://test.invalid/api/owner/growth/program'
  assert.equal((await api.request(url, { method:'POST' }, { DB:db, DB_PRIMARY:'neon' })).status, 401)
  assert.equal((await api.request(url, { method:'POST',headers:{'X-Test-Role':'capster'} }, { DB:db, DB_PRIMARY:'neon' })).status, 403)
  assert.equal((await api.request(url, { method:'POST',headers:{'X-Test-Role':'owner'} }, { DB:db, DB_PRIMARY:'d1' })).status, 503)
})

test('retention evidence never equates same-day services with returns', () => {
  assert.equal(returnPattern(['2026-01-01T10:00','2026-01-01T11:00'], '2026-01-02').visit_count, 1)
  assert.equal(returnPattern(['2026-01-01','2026-01-08','2026-01-15'],'2026-01-21').state,'due')
})
