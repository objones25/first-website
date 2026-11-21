export class PayloadTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body is larger than ${maxBytes} bytes`)
    this.name = 'PayloadTooLargeError'
  }
}

export class UpstreamTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Upstream did not respond within ${timeoutMs} ms`)
    this.name = 'UpstreamTimeoutError'
  }
}

export function jsonError(message: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

/** Copy only the named headers (lower-case names). Everything else is dropped. */
export function pickHeaders(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers()
  for (const name of names) {
    const value = source.get(name)
    if (value !== null) picked.set(name, value)
  }
  return picked
}

/** Read a request body, refusing to hold more than `maxBytes` of it. */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (declared > maxBytes) throw new PayloadTooLargeError(maxBytes)
  if (!request.body) return new Uint8Array(0)

  // Content-Length can be absent or wrong, so count what actually arrives.
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new PayloadTooLargeError(maxBytes)
    }
    chunks.push(value)
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

/**
 * fetch() that gives up if response headers have not arrived within `timeoutMs`.
 * The timer stops once headers arrive, so a streamed body is not cut off.
 */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = new UpstreamTimeoutError(timeoutMs)
  const timer = setTimeout(() => controller.abort(timeout), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) throw timeout
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Response headers a proxy passes back to the browser. CORS headers are ours to set. */
export function passthroughResponseHeaders(upstream: Headers): Headers {
  return pickHeaders(upstream, ['content-type', 'cache-control'])
}
