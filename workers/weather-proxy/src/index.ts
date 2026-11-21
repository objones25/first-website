import { gate, type GateEnv } from '../../shared/src/gate'
import { jsonError } from '../../shared/src/http'
import { proxyUpstream } from '../../shared/src/proxy'
import type { WorkerDeps } from '../../shared/src/worker'

const UPSTREAM = 'https://weather-api-production-0017.up.railway.app'
// The one route WeatherDemo.tsx calls.
const WEATHER_PATH = '/v1/weather'
const UPSTREAM_TIMEOUT_MS = 15_000
const LOCATION_MAX_CHARS = 200
const UNIT_GROUPS = new Set(['us', 'metric', 'uk'])
const INCLUDE_LIST = /^[a-z]{1,16}(,[a-z]{1,16}){0,7}$/

export interface Env extends GateEnv {
  WEATHER_API_KEY: string
}

/** Rebuild the query from the three parameters the demo sends. Returns an error message if one is invalid. */
function weatherQuery(params: URLSearchParams): URLSearchParams | string {
  const location = (params.get('location') ?? '').trim()
  if (location === '') return 'location is required'
  if (location.length > LOCATION_MAX_CHARS) return `location must be ${LOCATION_MAX_CHARS} characters or fewer`
  const query = new URLSearchParams({ location })

  const unitGroup = params.get('unit_group')
  if (unitGroup !== null) {
    if (!UNIT_GROUPS.has(unitGroup)) return 'unit_group must be us, metric or uk'
    query.set('unit_group', unitGroup)
  }

  const include = params.get('include')
  if (include !== null) {
    if (!INCLUDE_LIST.test(include)) return 'include must be a comma-separated list of words'
    query.set('include', include)
  }
  return query
}

export function createWorker(deps: WorkerDeps = {}) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const gated = await gate(request, env, { methods: ['GET'], jwks: deps.jwks })
      if (!gated.ok) return gated.response

      const url = new URL(request.url)
      if (url.pathname !== WEATHER_PATH) return jsonError('Not found', 404, gated.cors)

      const query = weatherQuery(url.searchParams)
      if (typeof query === 'string') return jsonError(query, 400, gated.cors)

      return proxyUpstream({
        url: `${UPSTREAM}${WEATHER_PATH}?${query}`,
        method: 'GET',
        headers: new Headers({ Accept: 'application/json', 'X-API-Key': env.WEATHER_API_KEY }),
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        cors: gated.cors,
      })
    },
  }
}

export default createWorker()
