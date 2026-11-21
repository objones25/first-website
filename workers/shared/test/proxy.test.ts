import { describe, expect, it, vi } from 'vitest'
import { proxyUpstream } from '../src/proxy'
import { recordUpstream } from './helpers'

const cors = { 'Access-Control-Allow-Origin': 'https://owenbeckettjones.com' }
const call = (timeoutMs = 1000) =>
  proxyUpstream({ url: 'https://upstream.test/x', method: 'GET', headers: new Headers(), timeoutMs, cors })

describe('proxyUpstream', () => {
  it('passes a success through with our CORS headers and none of the upstream ones', async () => {
    recordUpstream(vi.stubGlobal, () =>
      new Response('{"ok":true}', {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': 'session=upstream',
          'X-Powered-By': 'railway',
        },
      }),
    )
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://owenbeckettjones.com')
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(res.headers.get('X-Powered-By')).toBeNull()
  })

  it('passes an upstream 4xx through, since that is the API answering the caller', async () => {
    recordUpstream(vi.stubGlobal, () => Response.json({ detail: 'Unsupported file type' }, { status: 415 }))
    const res = await call()
    expect(res.status).toBe(415)
    expect(await res.json()).toEqual({ detail: 'Unsupported file type' })
  })

  it('replaces an upstream 5xx body with a generic 502', async () => {
    recordUpstream(vi.stubGlobal, () => new Response('Traceback: secret=hunter2', { status: 500 }))
    const res = await call()
    expect(res.status).toBe(502)
    expect(await res.text()).toBe('{"error":"Upstream service error"}')
  })

  it('answers 504 when the upstream does not respond in time', async () => {
    recordUpstream(vi.stubGlobal, () => new Promise<Response>(() => {}))
    const res = await call(10)
    expect(res.status).toBe(504)
    expect(await res.json()).toEqual({ error: 'Upstream timed out' })
  })

  it('answers 502 when the upstream cannot be reached', async () => {
    recordUpstream(vi.stubGlobal, () => { throw new TypeError('connect ECONNREFUSED 10.0.0.1') })
    const res = await call()
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'Upstream unreachable' })
  })
})
