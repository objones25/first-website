import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { isAllowedOrigin } from './origin'

/** The session token is missing, malformed, expired, or not ours. */
export class AuthError extends Error {
  constructor(message = 'Invalid or expired session token') {
    super(message)
    this.name = 'AuthError'
  }
}

export interface VerifyOptions {
  /** The Clerk Frontend API URL, which Clerk puts in the token's `iss` claim. */
  issuer: string
  /** Key lookup. Production uses `remoteJwks(issuer)`; tests pass a local set. */
  jwks: JWTVerifyGetKey
}

export interface Session {
  userId: string
}

const CLOCK_TOLERANCE_S = 5

/**
 * Verify a Clerk session JWT, following Clerk's manual verification steps:
 * RS256 signature against the instance's keys, `exp` and `nbf`, and `azp`
 * (when present) against the origins allowed to mint tokens. The issuer and a
 * non-empty `sub` are checked as well.
 */
export async function verifySessionToken(token: string, options: VerifyOptions): Promise<Session> {
  let payload
  try {
    ;({ payload } = await jwtVerify(token, options.jwks, {
      algorithms: ['RS256'],
      issuer: options.issuer,
      clockTolerance: CLOCK_TOLERANCE_S,
      requiredClaims: ['exp', 'sub'],
    }))
  } catch {
    // One message for every failure: the caller learns nothing about why.
    throw new AuthError()
  }

  if (typeof payload.sub !== 'string' || payload.sub === '') throw new AuthError()
  if (payload.azp !== undefined && !(typeof payload.azp === 'string' && isAllowedOrigin(payload.azp))) {
    throw new AuthError()
  }
  return { userId: payload.sub }
}

const BEARER = /^Bearer ([^\s]+)$/

export function bearerToken(headers: Headers): string | null {
  return BEARER.exec(headers.get('Authorization') ?? '')?.[1] ?? null
}

const remoteSets = new Map<string, JWTVerifyGetKey>()

/** The issuer's published key set. jose caches the keys and refetches on rotation. */
export function remoteJwks(issuer: string): JWTVerifyGetKey {
  let set = remoteSets.get(issuer)
  if (!set) {
    set = createRemoteJWKSet(new URL('/.well-known/jwks.json', issuer), { timeoutDuration: 5000 })
    remoteSets.set(issuer, set)
  }
  return set
}
