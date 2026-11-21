import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createWorker, type Env } from '../src/index'
import { FakeRateLimiter, ISSUER, SITE_ORIGIN, createTestKeys, fakeContext, recordUpstream, type TestKeys } from '../../shared/test/helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

interface Init {
  path?: string
  token?: string | null
  origin?: string | null
  upgrade?: boolean
  method?: string
  limiter?: FakeRateLimiter
}

async function connect(init: Init = {}) {
  const headers = new Headers()
  if (init.origin !== null) headers.set('Origin', init.origin ?? SITE_ORIGIN)
  if (init.upgrade !== false) headers.set('Upgrade', 'websocket')
  const url = new URL(`https://microagent.test${init.path ?? '/ws/run'}`)
  if (init.token !== null) url.searchParams.set('auth', init.token ?? (await keys.sign()))
  const env: Env = { CLERK_ISSUER: ISSUER, RATE_LIMITER: init.limiter ?? new FakeRateLimiter(), TOKEN: 'service-secret' }
  return createWorker({ jwks: keys.jwks }).fetch(new Request(url, { method: init.method ?? 'GET', headers }), env, fakeContext())
}

// Everything here is rejected before the upgrade, so the upstream must never be dialled.
// The relay itself needs the Workers runtime (WebSocketPair) and is not covered by these tests.
describe('microagent-proxy, before the upgrade', () => {
  it.each([
    ['no session token', { token: null }, 401],
    ['an expired session token', { token: 'expired' }, 401],
    ['a disallowed origin', { origin: 'https://evil.test' }, 403],
    ['no origin', { origin: null }, 403],
    ['a POST', { method: 'POST' }, 405],
    ['a plain HTTP request', { upgrade: false }, 426],
    ['another path', { path: '/ws/admin' }, 404],
    ['a user over the rate limit', { limiter: new FakeRateLimiter(false) }, 429],
  ] as [string, Init, number][])('rejects %s', async (_name, init, status) => {
    const calls = recordUpstream(vi.stubGlobal, () => new Response(null))
    const token = init.token === 'expired' ? await keys.sign({ expiresInSeconds: -120 }) : init.token
    const res = await connect({ ...init, token })
    expect(res.status).toBe(status)
    expect(calls).toHaveLength(0)
  })

  it('does not accept the session token from the Authorization header alone', async () => {
    const headers = new Headers({ Origin: SITE_ORIGIN, Upgrade: 'websocket', Authorization: `Bearer ${await keys.sign()}` })
    const env: Env = { CLERK_ISSUER: ISSUER, RATE_LIMITER: new FakeRateLimiter(), TOKEN: 'service-secret' }
    const res = await createWorker({ jwks: keys.jwks }).fetch(new Request('https://microagent.test/ws/run', { headers }), env, fakeContext())
    expect(res.status).toBe(401)
  })
})
