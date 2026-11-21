// The worker proxies answer errors as { "error": "..." }; the services behind
// them use FastAPI's { "detail": "..." }. Read whichever is there.
export async function readErrorMessage(res: Response): Promise<string> {
  const fallback = res.statusText || `Request failed (${res.status})`
  let data: unknown
  try {
    data = await res.json()
  } catch {
    return fallback // not JSON: the status line is all there is
  }
  if (typeof data !== 'object' || data === null) return fallback
  const { error, detail } = data as { error?: unknown; detail?: unknown }
  if (typeof error === 'string') return error
  if (typeof detail === 'string') return detail
  return fallback
}
