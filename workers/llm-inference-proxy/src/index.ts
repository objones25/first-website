const UPSTREAM = 'https://api.runpod.ai/v2/kfk2n5xybfkdov'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

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

    let streamRes: Response
    try {
      streamRes = await fetch(`${UPSTREAM}/stream/${runBody.id}`, {
        headers: { Authorization: `Bearer ${env.RUNPOD_API_KEY}` },
      })
    } catch {
      return jsonError('Failed to reach inference backend stream', 502)
    }

    if (!streamRes.ok || !streamRes.body) {
      const text = await streamRes.text().catch(() => '')
      return jsonError(`Inference backend stream failed: ${streamRes.status} ${text}`, 502)
    }

    return new Response(streamRes.body, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson', ...CORS_HEADERS },
    })
  },
}
