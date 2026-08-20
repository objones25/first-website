const UPSTREAM = 'https://api.runpod.ai/v2/kfk2n5xybfkdov'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

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

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'])

interface Env {
  RUNPOD_API_KEY: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, done: true }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface StreamPollResponse {
  status?: string
  stream?: unknown[]
}

function unwrap(item: unknown): unknown {
  if (item && typeof item === 'object' && 'output' in item) {
    return (item as { output: unknown }).output
  }
  return item
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return jsonError('Method not allowed', 405)
    }

    let input: unknown
    try {
      input = await request.json()
    } catch {
      return jsonError('Invalid JSON body', 400)
    }

    let runRes: Response
    try {
      runRes = await fetch(`${UPSTREAM}/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RUNPOD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      })
    } catch {
      return jsonError('Failed to reach inference backend', 502)
    }

    if (!runRes.ok) {
      const text = await runRes.text().catch(() => '')
      return jsonError(`Inference backend rejected the request: ${runRes.status} ${text}`, 502)
    }

    const runBody = (await runRes.json().catch(() => null)) as { id?: string } | null
    if (!runBody?.id) {
      return jsonError('Inference backend did not return a job id', 502)
    }
    const jobId = runBody.id

    const encoder = new TextEncoder()
    const authHeaders = { Authorization: `Bearer ${env.RUNPOD_API_KEY}` }

    const body = new ReadableStream({
      async start(controller) {
        const emit = (payload: unknown) => controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'))

        const deadline = Date.now() + MAX_POLL_MS
        let doneEmitted = false

        try {
          while (Date.now() < deadline) {
            let pollRes: Response
            try {
              pollRes = await fetch(`${UPSTREAM}/stream/${jobId}`, { headers: authHeaders })
            } catch {
              emit({ error: 'Lost connection to inference backend', done: true })
              break
            }

            if (!pollRes.ok) {
              emit({ error: `Inference backend stream failed: ${pollRes.status}`, done: true })
              break
            }

            const poll = (await pollRes.json().catch(() => null)) as StreamPollResponse | null
            const chunks = poll?.stream ?? []

            for (const item of chunks) {
              const payload = unwrap(item)
              if (payload && typeof payload === 'object' && (payload as { done?: unknown }).done === true) {
                doneEmitted = true
              }
              emit(payload)
            }

            const status = poll?.status
            if (status && TERMINAL_STATUSES.has(status)) {
              if (status !== 'COMPLETED') {
                emit({ error: `Inference job ${status.toLowerCase()}`, done: true })
              } else if (!doneEmitted) {
                emit({ done: true })
              }
              break
            }

            await sleep(POLL_INTERVAL_MS)
          }

          if (Date.now() >= deadline) {
            emit({ error: 'Timed out waiting for a response', done: true })
          }
        } catch {
          emit({ error: 'Stream interrupted', done: true })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson', ...CORS_HEADERS },
    })
  },
}
