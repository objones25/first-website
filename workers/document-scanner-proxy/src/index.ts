import { gate, type GateEnv } from '../../shared/src/gate'
import { PayloadTooLargeError, jsonError, readBodyCapped } from '../../shared/src/http'
import { proxyUpstream } from '../../shared/src/proxy'
import type { WorkerDeps } from '../../shared/src/worker'

const UPSTREAM = 'https://document-scanner-summarizer-production.up.railway.app'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_JSON_BYTES = 16 * 1024

export interface Env extends GateEnv {
  TOKEN: string
}

interface Route {
  method: 'POST' | 'DELETE'
  path: RegExp
  /** Required Content-Type prefix, or null for a route with no body. */
  contentType: string | null
  maxBodyBytes: number
  /** Time allowed for response headers. Extraction (OCR, URL fetch) is the slow one. */
  timeoutMs: number
}

const SESSION_ID = '[A-Za-z0-9_-]{1,128}'

// The four calls DocumentScannerDemo.tsx makes. Nothing else is forwarded.
const ROUTES: readonly Route[] = [
  { method: 'POST', path: /^\/api\/sessions$/, contentType: 'multipart/form-data', maxBodyBytes: MAX_UPLOAD_BYTES, timeoutMs: 120_000 },
  { method: 'POST', path: new RegExp(`^/api/sessions/${SESSION_ID}/summary$`), contentType: 'application/json', maxBodyBytes: MAX_JSON_BYTES, timeoutMs: 60_000 },
  { method: 'POST', path: new RegExp(`^/api/sessions/${SESSION_ID}/chat$`), contentType: 'application/json', maxBodyBytes: MAX_JSON_BYTES, timeoutMs: 60_000 },
  { method: 'DELETE', path: new RegExp(`^/api/sessions/${SESSION_ID}$`), contentType: null, maxBodyBytes: 0, timeoutMs: 15_000 },
]

export function createWorker(deps: WorkerDeps = {}) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const gated = await gate(request, env, { methods: ['POST', 'DELETE'], jwks: deps.jwks })
      if (!gated.ok) return gated.response
      const { cors } = gated

      const { pathname } = new URL(request.url)
      const route = ROUTES.find((r) => r.method === request.method && r.path.test(pathname))
      if (!route) return jsonError('Not found', 404, cors)

      const headers = new Headers({ Authorization: `Bearer ${env.TOKEN}` })
      let body: Uint8Array | undefined
      if (route.contentType !== null) {
        const contentType = request.headers.get('Content-Type') ?? ''
        if (!contentType.toLowerCase().startsWith(route.contentType)) {
          return jsonError(`Content-Type must be ${route.contentType}`, 415, cors)
        }
        // Forwarded as sent: a multipart type carries the boundary the body uses.
        headers.set('Content-Type', contentType)
        try {
          body = await readBodyCapped(request, route.maxBodyBytes)
        } catch (err) {
          if (err instanceof PayloadTooLargeError) return jsonError(err.message, 413, cors)
          throw err
        }
      }

      return proxyUpstream({
        url: `${UPSTREAM}${pathname}`,
        method: route.method,
        headers,
        body,
        timeoutMs: route.timeoutMs,
        cors,
      })
    },
  }
}

export default createWorker()
