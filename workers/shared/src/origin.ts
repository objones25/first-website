export const SITE_ORIGIN = 'https://owenbeckettjones.com'

const LOCALHOST_ORIGIN = /^https?:\/\/localhost(:\d{1,5})?$/

/** One origin policy for every worker: the live site, plus a local dev server. */
export function isAllowedOrigin(origin: string): boolean {
  return origin === SITE_ORIGIN || LOCALHOST_ORIGIN.test(origin)
}

export interface CorsOptions {
  /** Methods the worker serves. OPTIONS is added for the preflight. */
  methods: readonly string[]
  /** Request headers the browser may send. */
  headers: readonly string[]
}

export function corsHeaders(origin: string, options: CorsOptions): Record<string, string> {
  return {
    // A disallowed origin gets the site origin back, never its own.
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : SITE_ORIGIN,
    'Access-Control-Allow-Methods': [...options.methods, 'OPTIONS'].join(', '),
    'Access-Control-Allow-Headers': options.headers.join(', '),
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}
