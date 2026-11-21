import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MAX_BODY_BYTES, createWorker, type Env } from '../src/index'
import {
  FakeRateLimiter,
  ISSUER,
  SITE_ORIGIN,
  createTestKeys,
  fakeContext,
  recordUpstream,
  type TestKeys,
  type UpstreamCall,
} from '../../shared/test/helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

const RUNPOD = 'https://api.runpod.ai/v2/kfk2n5xybfkdov'
const env = (): Env => ({ CLERK_ISSUER: ISSUER, RATE_LIMITER: new FakeRateLimiter(), RUNPOD_API_KEY: 'runpod-secret' })
const valid = { messages: [{ role: 'user', content: 'Hi' }], max_new_tokens: 32, temperature: 0 }

interface Init {
  body?: unknown
  rawBody?: string
  method?: string
  path?: string
  token?: string | null
  origin?: string
  maxPollMs?: number
}

async function send(init: Init = {}) {
  const headers = new Headers({ Origin: init.origin ?? SITE_ORIGIN, 'Content-Type': 'application/json' })
  if (init.token !== null) headers.set('Authorization', `Bearer ${init.token ?? (await keys.sign())}`)
  const method = init.method ?? 'POST'
  const worker = createWorker({ jwks: keys.jwks, pollIntervalMs: 1, maxPollMs: init.maxPollMs ?? 2000 })
  const ctx = fakeContext()
  const res = await worker.fetch(
    new Request(`https://llm.test${init.path ?? '/'}`, {
      method,
      headers,
      body: method === 'POST' ? (init.rawBody ?? JSON.stringify(init.body ?? valid)) : undefined,
    }),
    env(),
    ctx,
  )
  return { res, ctx }
}

type Poll = { status: string; stream?: unknown[] }

/** RunPod stub: /run returns a job id, /stream returns the scripted polls in order (the last one repeats). */
function runpod(polls: Poll[], run: () => Response = () => Response.json({ id: 'job-1', status: 'IN_QUEUE' })) {
  let next = 0
  return recordUpstream(vi.stubGlobal, (call: UpstreamCall) => {
    if (call.url === `${RUNPOD}/run`) return run()
    if (call.url === `${RUNPOD}/stream/job-1`) return Response.json(polls[Math.min(next++, polls.length - 1)])
    if (call.url === `${RUNPOD}/cancel/job-1`) return Response.json({ id: 'job-1', status: 'CANCELLED' })
    throw new Error(`unexpected upstream call: ${call.method} ${call.url}`)
  })
}

async function lines(res: Response): Promise<unknown[]> {
  return (await res.text()).trim().split('\n').map((line) => JSON.parse(line) as unknown)
}

const token = (text: string) => ({ output: { token: text } })

describe('llm-inference-proxy', () => {
  it('submits only the validated input, with the RunPod key', async () => {
    const calls = runpod([{ status: 'COMPLETED', stream: [token('Hello')] }])
    const { res } = await send()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/x-ndjson')
    await res.text()
    const run = calls[0]
    expect(run.url).toBe(`${RUNPOD}/run`)
    expect(run.method).toBe('POST')
    expect(run.headers.get('Authorization')).toBe('Bearer runpod-secret')
    expect(JSON.parse(new TextDecoder().decode(run.body))).toEqual({ input: valid })
  })

  it('forwards each chunk exactly once across polls and ends with done', async () => {
    runpod([
      { status: 'IN_QUEUE', stream: [] },
      { status: 'IN_PROGRESS', stream: [token('a')] },
      { status: 'IN_PROGRESS', stream: [token('b'), token('c')] },
      { status: 'COMPLETED', stream: [] },
    ])
    const { res } = await send()
    expect(await lines(res)).toEqual([{ token: 'a' }, { token: 'b' }, { token: 'c' }, { done: true }])
  })

  it('does not add a second done when the model already sent one', async () => {
    runpod([{ status: 'COMPLETED', stream: [token('a'), { output: { done: true } }] }])
    const { res } = await send()
    expect(await lines(res)).toEqual([{ token: 'a' }, { done: true }])
  })

  it('reports a failed job as an error line', async () => {
    runpod([{ status: 'FAILED', stream: [] }])
    const { res } = await send()
    expect(await lines(res)).toEqual([{ error: 'Inference job failed', done: true }])
  })

  it('cancels the RunPod job and stops polling when the client disconnects', async () => {
    const calls = runpod([{ status: 'IN_PROGRESS', stream: [token('a')] }])
    const { res, ctx } = await send()
    const reader = res.body!.getReader()
    await reader.read()
    await reader.cancel()
    await ctx.settled()
    const cancels = calls.filter((c) => c.url === `${RUNPOD}/cancel/job-1`)
    expect(cancels).toHaveLength(1)
    expect(cancels[0].method).toBe('POST')
    expect(cancels[0].headers.get('Authorization')).toBe('Bearer runpod-secret')
    const pollsAtCancel = calls.length
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(calls.length).toBe(pollsAtCancel)
  })

  it('gives up and cancels the job at the deadline', async () => {
    const calls = runpod([{ status: 'IN_QUEUE', stream: [] }])
    const { res, ctx } = await send({ maxPollMs: 20 })
    expect(await lines(res)).toEqual([{ error: 'Timed out waiting for a response', done: true }])
    await ctx.settled()
    expect(calls.filter((c) => c.url === `${RUNPOD}/cancel/job-1`)).toHaveLength(1)
  })

  it('answers 502 without the upstream text when RunPod rejects the job', async () => {
    runpod([], () => new Response('invalid api key rp_live_abc', { status: 401 }))
    const { res } = await send()
    expect(res.status).toBe(502)
    expect(await res.text()).toBe('{"error":"Inference backend rejected the request"}')
  })

  it('answers 502 when RunPod returns no usable job id', async () => {
    runpod([], () => Response.json({ id: '../../admin' }))
    const { res } = await send()
    expect(res.status).toBe(502)
  })

  it.each([
    ['no token', { token: null }, 401],
    ['a disallowed origin', { origin: 'https://evil.test' }, 403],
    ['a GET', { method: 'GET' }, 405],
    ['another path', { path: '/v2/other' }, 404],
    ['invalid JSON', { rawBody: '{not json' }, 400],
    ['max_new_tokens above the slider range', { body: { ...valid, max_new_tokens: 4096 } }, 422],
    ['temperature above the slider range', { body: { ...valid, temperature: 2 } }, 422],
    ['an unknown field', { body: { ...valid, top_k: 1 } }, 422],
    ['a body over the cap', { rawBody: JSON.stringify({ ...valid, pad: 'x'.repeat(MAX_BODY_BYTES) }) }, 413],
  ] as [string, Init, number][])('rejects %s without calling RunPod', async (_name, init, status) => {
    const calls = runpod([{ status: 'COMPLETED' }])
    const { res } = await send(init)
    expect(res.status).toBe(status)
    expect(Object.keys((await res.json()) as object)).toEqual(['error'])
    expect(calls).toHaveLength(0)
  })
})
