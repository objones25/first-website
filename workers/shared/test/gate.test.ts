import { beforeAll, describe, expect, it } from 'vitest'
import { gate, type GateEnv } from '../src/gate'
import { FakeRateLimiter, ISSUER, SITE_ORIGIN, createTestKeys, type TestKeys } from './helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

function env(limiter = new FakeRateLimiter()): GateEnv {
  return { CLERK_ISSUER: ISSUER, RATE_LIMITER: limiter }
}

function run(request: Request, e: GateEnv = env()) {
  return gate(request, e, { methods: ['GET'], jwks: keys.jwks })
}

async function request(init: { method?: string; origin?: string | null; token?: string | null } = {}) {
  const headers = new Headers()
  if (init.origin !== null) headers.set('Origin', init.origin ?? SITE_ORIGIN)
  if (init.token !== null) headers.set('Authorization', `Bearer ${init.token ?? (await keys.sign())}`)
  return new Request('https://worker.test/', { method: init.method ?? 'GET', headers })
}

async function rejection(result: Awaited<ReturnType<typeof gate>>) {
  if (result.ok) throw new Error('expected the gate to reject')
  return { status: result.response.status, body: await result.response.text(), headers: result.response.headers }
}

describe('gate', () => {
  it('lets a signed-in request from the site through', async () => {
    const limiter = new FakeRateLimiter()
    const result = await run(await request(), env(limiter))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session).toEqual({ userId: 'user_test123' })
    expect(result.cors['Access-Control-Allow-Origin']).toBe(SITE_ORIGIN)
    expect(result.cors['Access-Control-Allow-Headers']).toBe('Authorization, Content-Type')
    expect(limiter.keys).toEqual(['user_test123'])
  })

  it.each([null, 'https://evil.test'])('rejects origin %j with 403', async (origin) => {
    const { status, body } = await rejection(await run(await request({ origin })))
    expect(status).toBe(403)
    expect(JSON.parse(body)).toEqual({ error: 'Origin not allowed' })
  })

  it('answers a preflight without a token', async () => {
    const { status, headers } = await rejection(await run(await request({ method: 'OPTIONS', token: null })))
    expect(status).toBe(204)
    expect(headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
  })

  it('rejects a preflight from a disallowed origin', async () => {
    const result = await run(await request({ method: 'OPTIONS', token: null, origin: 'https://evil.test' }))
    expect((await rejection(result)).status).toBe(403)
  })

  it('rejects a method that is not served with 405', async () => {
    const { status, headers } = await rejection(await run(await request({ method: 'DELETE' })))
    expect(status).toBe(405)
    expect(headers.get('Allow')).toBe('GET, OPTIONS')
  })

  it('rejects a request with no token with 401', async () => {
    const { status, body, headers } = await rejection(await run(await request({ token: null })))
    expect(status).toBe(401)
    expect(JSON.parse(body)).toEqual({ error: 'Sign in to use this demo' })
    expect(headers.get('Access-Control-Allow-Origin')).toBe(SITE_ORIGIN)
  })

  it('rejects an expired token with 401', async () => {
    const token = await keys.sign({ expiresInSeconds: -120 })
    const { status, body } = await rejection(await run(await request({ token })))
    expect(status).toBe(401)
    expect(JSON.parse(body)).toEqual({ error: 'Invalid or expired session token' })
  })

  it('rejects with 429 once the user is over the rate limit', async () => {
    const { status, headers } = await rejection(await run(await request(), env(new FakeRateLimiter(false))))
    expect(status).toBe(429)
    expect(headers.get('Retry-After')).toBe('60')
  })

  it('does not spend rate limit on unauthenticated requests', async () => {
    const limiter = new FakeRateLimiter()
    await run(await request({ token: null }), env(limiter))
    expect(limiter.keys).toEqual([])
  })

  it('reads the token from a custom source', async () => {
    const token = await keys.sign()
    const result = await gate(new Request(`https://worker.test/?auth=${token}`, { headers: { Origin: SITE_ORIGIN } }), env(), {
      methods: ['GET'],
      jwks: keys.jwks,
      tokenFrom: (req) => new URL(req.url).searchParams.get('auth'),
    })
    expect(result.ok).toBe(true)
  })

  it('throws when the issuer is not configured', async () => {
    const broken = { ...env(), CLERK_ISSUER: '' }
    await expect(run(await request(), broken)).rejects.toThrow('CLERK_ISSUER')
  })
})
