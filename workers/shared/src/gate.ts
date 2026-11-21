import type { JWTVerifyGetKey } from 'jose'
import { AuthError, bearerToken, remoteJwks, verifySessionToken, type Session } from './auth'
import { jsonError } from './http'
import { corsHeaders, isAllowedOrigin } from './origin'

/** The slice of a rate limiting binding the gate uses. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface GateEnv {
  CLERK_ISSUER: string
  RATE_LIMITER: RateLimiter
}

export interface GateOptions {
  /** Methods the worker serves, without OPTIONS. */
  methods: readonly string[]
  /** Key lookup for the session token. Defaults to the issuer's published keys. */
  jwks?: JWTVerifyGetKey
  /** Where the token is. Defaults to the Authorization header. */
  tokenFrom?: (request: Request) => string | null
}

export type GateResult =
  | { ok: false; response: Response }
  | { ok: true; session: Session; cors: Record<string, string> }

const ALLOWED_REQUEST_HEADERS = ['Authorization', 'Content-Type']
// Matches the 60 s window in each wrangler.toml [[ratelimits]] block.
const RATE_LIMIT_WINDOW_S = 60

/**
 * The checks every gated worker runs before it touches an upstream: origin,
 * preflight, method, session token, then the per-user rate limit. Anything
 * that fails is answered here and never reaches the upstream.
 */
export async function gate(request: Request, env: GateEnv, options: GateOptions): Promise<GateResult> {
  if (!env.CLERK_ISSUER) throw new Error('CLERK_ISSUER is not set in wrangler.toml [vars]')

  const origin = request.headers.get('Origin') ?? ''
  const cors = corsHeaders(origin, { methods: options.methods, headers: ALLOWED_REQUEST_HEADERS })
  const reject = (message: string, status: number, extra: Record<string, string> = {}): GateResult => ({
    ok: false,
    response: jsonError(message, status, { ...cors, ...extra }),
  })

  if (!isAllowedOrigin(origin)) return reject('Origin not allowed', 403)
  if (request.method === 'OPTIONS') {
    return { ok: false, response: new Response(null, { status: 204, headers: cors }) }
  }
  if (!options.methods.includes(request.method)) {
    return reject('Method not allowed', 405, { Allow: [...options.methods, 'OPTIONS'].join(', ') })
  }

  const token = (options.tokenFrom ?? ((req) => bearerToken(req.headers)))(request)
  if (!token) return reject('Sign in to use this demo', 401)

  let session: Session
  try {
    session = await verifySessionToken(token, {
      issuer: env.CLERK_ISSUER,
      jwks: options.jwks ?? remoteJwks(env.CLERK_ISSUER),
    })
  } catch (err) {
    if (err instanceof AuthError) return reject(err.message, 401)
    throw err
  }

  const { success } = await env.RATE_LIMITER.limit({ key: session.userId })
  if (!success) {
    return reject('Too many requests, try again in a minute', 429, { 'Retry-After': String(RATE_LIMIT_WINDOW_S) })
  }

  return { ok: true, session, cors }
}
