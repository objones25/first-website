import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MAX_JSON_BYTES, MAX_UPLOAD_BYTES, createWorker, type Env } from '../src/index'
import { FakeRateLimiter, ISSUER, SITE_ORIGIN, createTestKeys, recordUpstream, type TestKeys } from '../../shared/test/helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

const env = (): Env => ({ CLERK_ISSUER: ISSUER, RATE_LIMITER: new FakeRateLimiter(), TOKEN: 'scanner-secret' })

interface Init {
  method?: string
  body?: BodyInit
  contentType?: string | null
  token?: string | null
  origin?: string
}

async function send(path: string, init: Init = {}) {
  const headers = new Headers({ Origin: init.origin ?? SITE_ORIGIN, Cookie: 'a=b' })
  if (init.token !== null) headers.set('Authorization', `Bearer ${init.token ?? (await keys.sign())}`)
  if (init.contentType) headers.set('Content-Type', init.contentType)
  const worker = createWorker({ jwks: keys.jwks })
  return worker.fetch(
    new Request(`https://scanner.test${path}`, { method: init.method ?? 'POST', headers, body: init.body }),
    env(),
  )
}

const json = (value: unknown): Init => ({ body: JSON.stringify(value), contentType: 'application/json' })
const ok = () => recordUpstream(vi.stubGlobal, () => Response.json({ session_id: 'abc' }))

describe('document-scanner-proxy', () => {
  it('forwards an upload with the service token in place of the session token', async () => {
    const calls = ok()
    const form = new FormData()
    form.append('url', 'https://example.com/doc.pdf')
    form.append('provider', 'anthropic')
    const res = await send('/api/sessions', { body: form })
    expect(res.status).toBe(200)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://document-scanner-summarizer-production.up.railway.app/api/sessions')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].headers.get('Authorization')).toBe('Bearer scanner-secret')
    expect(calls[0].headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=/)
    expect(calls[0].headers.get('Cookie')).toBeNull()
    expect(new TextDecoder().decode(calls[0].body)).toContain('https://example.com/doc.pdf')
  })

  it.each([
    ['POST', '/api/sessions/sess_1-A/summary', json({ style: 'brief' })],
    ['POST', '/api/sessions/sess_1-A/chat', json({ message: 'hi' })],
    ['DELETE', '/api/sessions/sess_1-A', {}],
  ] as [string, string, Init][])('forwards %s %s', async (method, path, init) => {
    const calls = ok()
    const res = await send(path, { ...init, method })
    expect(res.status).toBe(200)
    expect(calls[0].method).toBe(method)
    expect(new URL(calls[0].url).pathname).toBe(path)
  })

  it('streams an upstream event stream back', async () => {
    recordUpstream(vi.stubGlobal, () =>
      new Response('data: {"token":"a"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }),
    )
    const res = await send('/api/sessions/s1/chat', json({ message: 'hi' }))
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(await res.text()).toBe('data: {"token":"a"}\n\n')
  })

  it.each([
    ['no token', '/api/sessions', { token: null } as Init, 401],
    ['a disallowed origin', '/api/sessions', { origin: 'https://evil.test' } as Init, 403],
    ['a PUT', '/api/sessions/s1', { method: 'PUT' } as Init, 405],
    ['GET on a session', '/api/sessions/s1', { method: 'GET' } as Init, 405],
    ['an unknown path', '/api/admin', {} as Init, 404],
    ['DELETE on the collection', '/api/sessions', { method: 'DELETE' } as Init, 404],
    ['a session id with a slash', '/api/sessions/a/b/chat', json({ message: 'hi' }), 404],
    ['an encoded traversal', '/api/sessions/..%2Fadmin/chat', json({ message: 'hi' }), 404],
    ['a JSON route sent as a form', '/api/sessions/s1/chat', { body: 'a=b', contentType: 'text/plain' } as Init, 415],
    ['an upload sent as JSON', '/api/sessions', json({ url: 'x' }), 415],
  ])('rejects %s without calling the upstream', async (_name, path, init, status) => {
    const calls = ok()
    const res = await send(path, init)
    expect(res.status).toBe(status)
    expect(calls).toHaveLength(0)
  })

  it('rejects a JSON body over the cap with 413', async () => {
    const calls = ok()
    const res = await send('/api/sessions/s1/chat', json({ message: 'x'.repeat(MAX_JSON_BYTES) }))
    expect(res.status).toBe(413)
    expect(calls).toHaveLength(0)
  })

  it('rejects an upload over the cap with 413', async () => {
    const calls = ok()
    const res = await send('/api/sessions', {
      body: new Uint8Array(MAX_UPLOAD_BYTES + 1),
      contentType: 'multipart/form-data; boundary=x',
    })
    expect(res.status).toBe(413)
    expect(calls).toHaveLength(0)
  })
})
