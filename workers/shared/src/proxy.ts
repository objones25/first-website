import { UpstreamTimeoutError, fetchWithTimeout, jsonError, passthroughResponseHeaders } from './http'

export interface ProxyRequest {
  url: string
  method: string
  /** Headers for the upstream, built by the worker. Client headers are not forwarded wholesale. */
  headers: Headers
  body?: Uint8Array
  timeoutMs: number
  cors: Record<string, string>
}

/**
 * Send one request upstream and shape the answer for the browser. A 4xx is the
 * upstream API answering the caller, so it passes through. A 5xx body can hold
 * anything (stack traces, config), so it is replaced with a generic 502.
 */
export async function proxyUpstream(request: ProxyRequest): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetchWithTimeout(
      request.url,
      {
        method: request.method,
        headers: request.headers,
        body: request.body && request.body.byteLength > 0 ? request.body : undefined,
      },
      request.timeoutMs,
    )
  } catch (err) {
    if (err instanceof UpstreamTimeoutError) return jsonError('Upstream timed out', 504, request.cors)
    return jsonError('Upstream unreachable', 502, request.cors)
  }

  if (upstream.status >= 500) {
    await upstream.body?.cancel()
    return jsonError('Upstream service error', 502, request.cors)
  }

  const headers = passthroughResponseHeaders(upstream.headers)
  for (const [name, value] of Object.entries(request.cors)) headers.set(name, value)
  return new Response(upstream.body, { status: upstream.status, headers })
}
