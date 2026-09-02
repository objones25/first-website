const UPSTREAM = 'https://microagent-production.up.railway.app'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

interface Env {
  TOKEN: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const origin = request.headers.get('Origin') ?? ''
    const isAllowed = origin === ALLOWED_ORIGIN || /^https?:\/\/localhost(:\d+)?$/.test(origin)
    if (!isAllowed) {
      return new Response('Forbidden', { status: 403 })
    }

    const url = new URL(request.url)
    const upstreamUrl = new URL(UPSTREAM)
    upstreamUrl.pathname = url.pathname
    upstreamUrl.search = url.search
    upstreamUrl.searchParams.set('token', env.TOKEN)

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
    const pendingToUpstream: (string | ArrayBuffer)[] = []

    server.addEventListener('message', ({ data }) => {
      if (state.upstream) {
        try { state.upstream.send(data as string | ArrayBuffer) } catch { /* upstream closed */ }
      } else {
        pendingToUpstream.push(data as string | ArrayBuffer)
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
        resp = await fetch(upstreamUrl.toString(), { headers: { Upgrade: 'websocket' } })
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

      for (const msg of pendingToUpstream) {
        try { ws.send(msg) } catch { /* ignore */ }
      }
      pendingToUpstream.length = 0

      if (state.clientClosed) {
        try { ws.close(state.clientClosed.code, state.clientClosed.reason) } catch { /* already closed */ }
        return
      }

      ws.addEventListener('message', ({ data }) => {
        try { server.send(data as string | ArrayBuffer) } catch { /* client closed */ }
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
