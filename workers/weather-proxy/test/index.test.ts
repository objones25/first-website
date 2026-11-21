import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createWorker, type Env } from '../src/index'
import { FakeRateLimiter, ISSUER, SITE_ORIGIN, createTestKeys, recordUpstream, type TestKeys } from '../../shared/test/helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

const env = (): Env => ({ CLERK_ISSUER: ISSUER, RATE_LIMITER: new FakeRateLimiter(), WEATHER_API_KEY: 'weather-secret' })

async function get(path: string, init: { token?: string | null; origin?: string; method?: string } = {}) {
  const headers = new Headers({ Origin: init.origin ?? SITE_ORIGIN, Cookie: 'a=b', 'X-Api-Key': 'client-supplied' })
  if (init.token !== null) headers.set('Authorization', `Bearer ${init.token ?? (await keys.sign())}`)
  const worker = createWorker({ jwks: keys.jwks })
  return worker.fetch(new Request(`https://weather.test${path}`, { method: init.method ?? 'GET', headers }), env())
}

const ok = () => recordUpstream(vi.stubGlobal, () => Response.json({ days: [] }))

describe('weather-proxy', () => {
  it('forwards an allowed query with the API key and nothing else from the client', async () => {
    const calls = ok()
    const res = await get('/v1/weather?location=Santa%20Barbara&unit_group=us&include=current,days&debug=1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ days: [] })
    expect(calls).toHaveLength(1)
    const url = new URL(calls[0].url)
    expect(url.origin + url.pathname).toBe('https://weather-api-production-0017.up.railway.app/v1/weather')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      location: 'Santa Barbara',
      unit_group: 'us',
      include: 'current,days',
    })
    expect(calls[0].headers.get('X-API-Key')).toBe('weather-secret')
    expect(calls[0].headers.get('Cookie')).toBeNull()
    expect(calls[0].headers.get('Authorization')).toBeNull()
  })

  it.each([
    ['no token', { token: null }, 401],
    ['a disallowed origin', { origin: 'https://evil.test' }, 403],
    ['a POST', { method: 'POST' }, 405],
  ])('rejects %s without calling the upstream', async (_name, init, status) => {
    const calls = ok()
    const res = await get('/v1/weather?location=Paris', init)
    expect(res.status).toBe(status)
    expect(calls).toHaveLength(0)
  })

  it.each(['/', '/v1/admin', '/v1/weather/extra', '/v1/weather/../admin'])(
    'answers 404 for path %s',
    async (path) => {
      const calls = ok()
      expect((await get(`${path}?location=Paris`)).status).toBe(404)
      expect(calls).toHaveLength(0)
    },
  )

  it.each([
    ['a missing location', ''],
    ['an empty location', '?location=%20'],
    ['a location over 200 characters', `?location=${'a'.repeat(201)}`],
    ['an unknown unit group', '?location=Paris&unit_group=kelvin'],
    ['a malformed include list', '?location=Paris&include=days;drop'],
  ])('answers 400 for %s', async (_name, query) => {
    const calls = ok()
    const res = await get(`/v1/weather${query}`)
    expect(res.status).toBe(400)
    expect(calls).toHaveLength(0)
  })
})
