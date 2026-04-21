const UPSTREAM = 'https://document-scanner-summarizer-production.up.railway.app'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

interface Env {
  TOKEN: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const upstream = new URL(UPSTREAM)
    upstream.pathname = url.pathname
    upstream.search = url.search

    const proxied = new Request(upstream.toString(), {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        Authorization: `Bearer ${env.TOKEN}`,
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE'
        ? request.body
        : null,
    })

    const response = await fetch(proxied)

    const upstreamHeaders = Object.fromEntries(
      [...response.headers.entries()].filter(([k]) => !k.startsWith('access-control-'))
    )

    return new Response(response.body, {
      status: response.status,
      headers: { ...upstreamHeaders, ...CORS_HEADERS },
    })
  },
}
