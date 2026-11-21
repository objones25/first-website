import { gate, type GateEnv } from '../../shared/src/gate'
import { PayloadTooLargeError, UpstreamTimeoutError, fetchWithTimeout, jsonError, readBodyCapped } from '../../shared/src/http'
import type { WorkerDeps } from '../../shared/src/worker'
import { parseChatInput } from './validate'

const UPSTREAM = 'https://api.runpod.ai/v2/kfk2n5xybfkdov'

// RunPod's GET /stream/{id} is not a single held-open connection in practice —
// it returns the current job state and closes immediately (empirically confirmed:
// a fetch right after /run returns `{"status":"IN_QUEUE","stream":[]}` with a
// content-length of a few dozen bytes). The client has to poll it until `status`
// reaches a terminal value. Each poll's `stream` array holds only the chunks
// produced since the *previous* poll (confirmed via wrangler tail — e.g. one poll
// returned 1 token, the next returned the next 3, not 4 cumulative), so every
// item in every poll gets forwarded as-is; there's no running offset to track.
// POLL_INTERVAL_MS trades responsiveness against request volume; MAX_POLL_MS
// leaves headroom past the documented ~100-120s scale-to-zero cold start.
const POLL_INTERVAL_MS = 400
const MAX_POLL_MS = 150_000
// Time allowed for any single RunPod call (/run, one /stream poll, /cancel).
const RUNPOD_CALL_TIMEOUT_MS = 15_000

export const MAX_BODY_BYTES = 256 * 1024

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'])
const JOB_ID = /^[A-Za-z0-9_-]{1,128}$/

export interface Env extends GateEnv {
  RUNPOD_API_KEY: string
}

export interface LlmWorkerDeps extends WorkerDeps {
  pollIntervalMs?: number
  maxPollMs?: number
}

interface StreamPollResponse {
  status?: string
  stream?: unknown[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function unwrap(item: unknown): unknown {
  if (item && typeof item === 'object' && 'output' in item) {
    return (item as { output: unknown }).output
  }
  return item
}

function isDone(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && (payload as { done?: unknown }).done === true
}

export function createWorker(deps: LlmWorkerDeps = {}) {
  const pollIntervalMs = deps.pollIntervalMs ?? POLL_INTERVAL_MS
  const maxPollMs = deps.maxPollMs ?? MAX_POLL_MS

  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const gated = await gate(request, env, { methods: ['POST'], jwks: deps.jwks })
      if (!gated.ok) return gated.response
      const { cors } = gated

      if (new URL(request.url).pathname !== '/') return jsonError('Not found', 404, cors)

      let raw: Uint8Array
      try {
        raw = await readBodyCapped(request, MAX_BODY_BYTES)
      } catch (err) {
        if (err instanceof PayloadTooLargeError) return jsonError(err.message, 413, cors)
        throw err
      }

      let body: unknown
      try {
        body = JSON.parse(new TextDecoder().decode(raw))
      } catch {
        return jsonError('Invalid JSON body', 400, cors)
      }

      const parsed = parseChatInput(body)
      if (!parsed.ok) return jsonError(parsed.message, 422, cors)

      const authHeaders = { Authorization: `Bearer ${env.RUNPOD_API_KEY}` }
      const runpod = (path: string, init: RequestInit = {}) =>
        fetchWithTimeout(`${UPSTREAM}${path}`, { ...init, headers: { ...authHeaders, ...init.headers } }, RUNPOD_CALL_TIMEOUT_MS)

      let runRes: Response
      try {
        runRes = await runpod('/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: parsed.input }),
        })
      } catch (err) {
        if (err instanceof UpstreamTimeoutError) return jsonError('Inference backend timed out', 504, cors)
        return jsonError('Failed to reach inference backend', 502, cors)
      }

      if (!runRes.ok) {
        // The upstream body is dropped: it can name the endpoint, the key or the account.
        await runRes.body?.cancel()
        return jsonError('Inference backend rejected the request', 502, cors)
      }

      const runBody = (await runRes.json().catch(() => null)) as { id?: unknown } | null
      const jobId = runBody?.id
      // The id goes into a URL path below, so it must look like an id.
      if (typeof jobId !== 'string' || !JOB_ID.test(jobId)) {
        return jsonError('Inference backend did not return a job id', 502, cors)
      }

      // Best effort: the reply is already over when this runs, so a failed
      // cancel has nobody to report to. RunPod's own execution timeout is the backstop.
      const cancelJob = () =>
        runpod(`/cancel/${jobId}`, { method: 'POST' })
          .then((res) => res.body?.cancel())
          .catch(() => {})

      const encoder = new TextEncoder()
      let clientGone = false

      const stream = new ReadableStream({
        async start(controller) {
          const emit = (payload: unknown) => {
            if (!clientGone) controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'))
          }

          const deadline = Date.now() + maxPollMs
          let doneEmitted = false

          try {
            while (!clientGone) {
              if (Date.now() >= deadline) {
                emit({ error: 'Timed out waiting for a response', done: true })
                ctx.waitUntil(cancelJob())
                break
              }

              let pollRes: Response
              try {
                pollRes = await runpod(`/stream/${jobId}`)
              } catch {
                emit({ error: 'Lost connection to inference backend', done: true })
                break
              }

              if (!pollRes.ok) {
                await pollRes.body?.cancel()
                emit({ error: `Inference backend stream failed: ${pollRes.status}`, done: true })
                break
              }

              const poll = (await pollRes.json().catch(() => null)) as StreamPollResponse | null
              const chunks = Array.isArray(poll?.stream) ? poll.stream : []

              for (const item of chunks) {
                const payload = unwrap(item)
                if (isDone(payload)) doneEmitted = true
                emit(payload)
              }

              const status = poll?.status
              if (status && TERMINAL_STATUSES.has(status)) {
                if (status !== 'COMPLETED') {
                  emit({ error: `Inference job ${status.toLowerCase().replace('_', ' ')}`, done: true })
                } else if (!doneEmitted) {
                  emit({ done: true })
                }
                break
              }

              await sleep(pollIntervalMs)
            }
          } catch {
            emit({ error: 'Stream interrupted', done: true })
          } finally {
            if (!clientGone) controller.close()
          }
        },
        // The browser went away (Stop button, tab closed): stop paying for the job.
        cancel() {
          clientGone = true
          ctx.waitUntil(cancelJob())
        },
      })

      return new Response(stream, {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' },
      })
    },
  }
}

export default createWorker()
