const UPSTREAM = 'wss://microagent-production.up.railway.app'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

interface Env {
  TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    const upstream = new WebSocket(upstreamUrl.toString())
    const { 0: client, 1: server } = new WebSocketPair()

    server.accept()

    const pendingToUpstream: (string | ArrayBuffer)[] = []
    let upstreamReady = false

    upstream.addEventListener('open', () => {
      upstreamReady = true
      for (const msg of pendingToUpstream) {
        try { upstream.send(msg) } catch { /* ignore */ }
      }
      pendingToUpstream.length = 0
    })

    server.addEventListener('message', ({ data }) => {
      if (upstreamReady) {
        try { upstream.send(data as string | ArrayBuffer) } catch { /* upstream closed */ }
      } else {
        pendingToUpstream.push(data as string | ArrayBuffer)
      }
    })

    upstream.addEventListener('message', ({ data }) => {
      try { server.send(data as string | ArrayBuffer) } catch { /* client closed */ }
    })

    server.addEventListener('close', ({ code, reason }) => {
      try { upstream.close(code, reason) } catch { /* already closed */ }
    })

    upstream.addEventListener('close', ({ code, reason }) => {
      try { server.close(code, reason) } catch { /* already closed */ }
    })

    server.addEventListener('error', () => {
      try { upstream.close(1011, 'client error') } catch { /* already closed */ }
    })

    upstream.addEventListener('error', () => {
      try { server.close(1011, 'upstream error') } catch { /* already closed */ }
    })

    return new Response(null, { status: 101, webSocket: client })
  },
}
