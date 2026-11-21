import type { JWTVerifyGetKey } from 'jose'

/** What a worker factory accepts. Production passes nothing; tests pass a local key set. */
export interface WorkerDeps {
  jwks?: JWTVerifyGetKey
}
