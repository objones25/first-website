const UPSTREAM = 'https://weather-api-production-0017.up.railway.app'
const ALLOWED_ORIGIN = 'https://owenbeckettjones.com'

interface Env {
  WEATHER_API_KEY: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        'X-API-Key': env.WEATHER_API_KEY,
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    })

    const response = await fetch(proxied)

    return new Response(response.body, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...CORS_HEADERS },
    })
  },
}
