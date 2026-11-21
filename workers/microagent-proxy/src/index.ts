import { gate, type GateEnv } from '../../shared/src/gate'
import { fetchWithTimeout, jsonError } from '../../shared/src/http'
import type { WorkerDeps } from '../../shared/src/worker'
import { CLOSE_TOO_BIG, MAX_MESSAGE_BYTES, PendingBuffer, messageBytes, upstreamUrl, type WsMessage } from './relay'

// The one route MicroagentDemo.tsx opens.
const RUN_PATH = '/ws/run'
const UPSTREAM_CONNECT_TIMEOUT_MS = 15_000

export interface Env extends GateEnv {
  TOKEN: string
}

export function createWorker(deps: WorkerDeps = {}) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      // A browser cannot set headers on a WebSocket, so the session token comes
      // in the `auth` query parameter. Clerk session tokens live for about a minute.
      const gated = await gate(request, env, {
        methods: ['GET'],
        jwks: deps.jwks,
        tokenFrom: (req) => new URL(req.url).searchParams.get('auth'),
      })
      if (!gated.ok) return gated.response

      if (new URL(request.url).pathname !== RUN_PATH) return jsonError('Not found', 404)
      if (request.headers.get('Upgrade') !== 'websocket') return jsonError('Expected WebSocket upgrade', 426)

      const target = upstreamUrl(request.url, env.TOKEN)

      const { 0: client, 1: server } = new WebSocketPair()
      // allowHalfOpen: a Close frame from the browser shouldn't auto-finish this
      // socket's handshake — we need the chance to relay it to `upstream` first.
      server.accept({ allowHalfOpen: true })

      // Held in an object, not a bare `let`, so TS doesn't over-narrow reads of
      // these across the separate closures below (they mutate at different times).
      const state: {
        upstream: WebSocket | null
        clientClosed: { code: number; reason: string } | null
      } = { upstream: null, clientClosed: null }
      const pending = new PendingBuffer()

      const rejectTooBig = () => {
        try { state.upstream?.close(CLOSE_TOO_BIG, 'message too big') } catch { /* already closed */ }
        try { server.close(CLOSE_TOO_BIG, 'message too big') } catch { /* already closed */ }
      }

      server.addEventListener('message', ({ data }) => {
        const message = data as WsMessage
        if (messageBytes(message) > MAX_MESSAGE_BYTES) return rejectTooBig()
        if (state.upstream) {
          try { state.upstream.send(message) } catch { /* upstream closed */ }
        } else if (!pending.push(message)) {
          rejectTooBig()
        }
      })

      server.addEventListener('close', (event) => {
        if (state.upstream) {
          try { state.upstream.close(event.code, event.reason) } catch { /* already closed */ }
        } else {
          // Upstream hasn't connected yet — remember to close it immediately once it does.
          state.clientClosed = { code: event.code, reason: event.reason }
        }
        // Reciprocate on this leg too — allowHalfOpen means the runtime won't do this for us.
        try { server.close(event.code, event.reason) } catch { /* already closed */ }
      })

      server.addEventListener('error', () => {
        try { state.upstream?.close(1011, 'client error') } catch { /* already closed */ }
      })

      // Connect upstream via fetch()+Upgrade (not `new WebSocket()`, which can't do
      // allowHalfOpen) so a Close frame from Railway doesn't auto-finish this leg
      // either — same proxying rationale as the server side above.
      ctx.waitUntil((async () => {
        let resp: Response
        try {
          resp = await fetchWithTimeout(target, { headers: { Upgrade: 'websocket' } }, UPSTREAM_CONNECT_TIMEOUT_MS)
        } catch {
          try { server.close(1011, 'upstream unreachable') } catch { /* already closed */ }
          return
        }

        const ws = resp.webSocket
        if (!ws) {
          try { server.close(1011, 'upstream did not accept WebSocket') } catch { /* already closed */ }
          return
        }
        ws.accept({ allowHalfOpen: true })
        state.upstream = ws

        for (const msg of pending.drain()) {
          try { ws.send(msg) } catch { /* ignore */ }
        }

        if (state.clientClosed) {
          try { ws.close(state.clientClosed.code, state.clientClosed.reason) } catch { /* already closed */ }
          return
        }

        ws.addEventListener('message', ({ data }) => {
          try { server.send(data as WsMessage) } catch { /* client closed */ }
        })

        ws.addEventListener('close', (event) => {
          try { server.close(event.code, event.reason) } catch { /* already closed */ }
          try { ws.close(event.code, event.reason) } catch { /* already closed */ }
        })

        ws.addEventListener('error', () => {
          try { server.close(1011, 'upstream error') } catch { /* already closed */ }
        })
      })())

      return new Response(null, { status: 101, webSocket: client })
    },
  }
}

export default createWorker()
