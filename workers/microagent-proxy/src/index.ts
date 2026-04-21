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

    let upstream: WebSocket
    try {
      upstream = new WebSocket(upstreamUrl.toString())
    } catch (err) {
      return new Response(`Upstream connect error: ${String(err)}`, { status: 502 })
    }

    const { 0: client, 1: server } = new WebSocketPair()

    upstream.accept()
    server.accept()

    server.addEventListener('message', ({ data }) => {
      try { upstream.send(data as string | ArrayBuffer) } catch { /* upstream closed */ }
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
