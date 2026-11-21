import { describe, expect, it, vi } from 'vitest'
import {
  PayloadTooLargeError,
  UpstreamTimeoutError,
  fetchWithTimeout,
  jsonError,
  pickHeaders,
  readBodyCapped,
} from '../src/http'

describe('pickHeaders', () => {
  it('keeps only the named headers', () => {
    const picked = pickHeaders(
      new Headers({ 'Content-Type': 'application/json', Cookie: 'a=b', Authorization: 'Bearer x', 'X-Api-Key': 'k' }),
      ['content-type', 'accept'],
    )
    expect([...picked.keys()]).toEqual(['content-type'])
  })
})

describe('readBodyCapped', () => {
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://worker.test/', { method: 'POST', body, headers })

  it('returns the bytes of a body within the cap', async () => {
    const bytes = await readBodyCapped(request('hello'), 5)
    expect(new TextDecoder().decode(bytes)).toBe('hello')
  })

  it('rejects a body one byte over the cap', async () => {
    await expect(readBodyCapped(request('hello!'), 5)).rejects.toBeInstanceOf(PayloadTooLargeError)
  })

  it('rejects on a declared Content-Length over the cap without reading', async () => {
    const req = request('hi', { 'Content-Length': '999999' })
    await expect(readBodyCapped(req, 5)).rejects.toBeInstanceOf(PayloadTooLargeError)
    expect(req.bodyUsed).toBe(false)
  })

  it('returns an empty buffer when there is no body', async () => {
    const bytes = await readBodyCapped(new Request('https://worker.test/', { method: 'POST' }), 5)
    expect(bytes.byteLength).toBe(0)
  })
})

describe('fetchWithTimeout', () => {
  it('throws UpstreamTimeoutError when no response arrives in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(init.signal!.reason))
        }),
      ),
    )
    await expect(fetchWithTimeout('https://upstream.test/', {}, 10)).rejects.toBeInstanceOf(UpstreamTimeoutError)
  })

  it('returns the response when it arrives in time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok')))
    const res = await fetchWithTimeout('https://upstream.test/', {}, 1000)
    expect(await res.text()).toBe('ok')
  })

  it('passes other failures through unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down') }))
    await expect(fetchWithTimeout('https://upstream.test/', {}, 1000)).rejects.toThrow('network down')
  })
})

describe('jsonError', () => {
  it('builds a JSON error body with the given status and headers', async () => {
    const res = jsonError('Nope', 418, { Vary: 'Origin' })
    expect(res.status).toBe(418)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(res.headers.get('Vary')).toBe('Origin')
    expect(await res.json()).toEqual({ error: 'Nope' })
  })
})
