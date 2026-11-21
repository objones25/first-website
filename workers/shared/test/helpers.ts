import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose'

export const ISSUER = 'https://clerk.example.test'
export const SITE_ORIGIN = 'https://owenbeckettjones.com'
const KID = 'test-key'

export interface TokenOverrides {
  issuer?: string
  subject?: string | null
  azp?: string | null
  /** null leaves the `exp` claim out. */
  expiresInSeconds?: number | null
  notBeforeInSeconds?: number
}

export interface TestKeys {
  jwks: JWTVerifyGetKey
  sign(overrides?: TokenOverrides): Promise<string>
  /** A token with the right claims, signed by a key the JWKS does not hold. */
  signWithOtherKey(): Promise<string>
}

async function signWith(privateKey: CryptoKey, overrides: TokenOverrides = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const claims: Record<string, unknown> = {}
  if (overrides.azp !== null) claims.azp = overrides.azp ?? SITE_ORIGIN
  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setIssuedAt(now)
    .setNotBefore(now + (overrides.notBeforeInSeconds ?? -10))
  if (overrides.expiresInSeconds !== null) jwt = jwt.setExpirationTime(now + (overrides.expiresInSeconds ?? 60))
  if (overrides.subject !== null) jwt = jwt.setSubject(overrides.subject ?? 'user_test123')
  return jwt.sign(privateKey)
}

export async function createTestKeys(): Promise<TestKeys> {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const other = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] })
  return {
    jwks,
    sign: (overrides) => signWith(privateKey, overrides),
    signWithOtherKey: () => signWith(other.privateKey),
  }
}

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function baseClaims(): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000)
  return { iss: ISSUER, sub: 'user_test123', azp: SITE_ORIGIN, iat: now, nbf: now - 10, exp: now + 60 }
}

/** An unsigned token: `alg: none` with an empty signature. */
export function unsignedToken(): string {
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(baseClaims())}.`
}

/** A token signed with HMAC, the classic algorithm-confusion attempt. */
export async function hmacToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ azp: SITE_ORIGIN })
    .setProtectedHeader({ alg: 'HS256', kid: KID })
    .setIssuer(ISSUER)
    .setSubject('user_test123')
    .setNotBefore(now - 10)
    .setExpirationTime(now + 60)
    .sign(new TextEncoder().encode('a-shared-secret-that-is-long-enough-for-hs256'))
}

/** Flip one character of the payload so the signature no longer matches. */
export function tamper(token: string): string {
  const [header, payload, signature] = token.split('.')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>
  claims.sub = 'user_someone_else'
  return `${header}.${b64url(claims)}.${signature}`
}

export class FakeRateLimiter {
  readonly keys: string[] = []
  constructor(private readonly allow = true) {}
  async limit({ key }: { key: string }): Promise<{ success: boolean }> {
    this.keys.push(key)
    return { success: this.allow }
  }
}

export interface UpstreamCall {
  url: string
  method: string
  headers: Headers
  body: Uint8Array
}

/** Stub global fetch with `respond` and record every call it receives. */
export function recordUpstream(
  stub: (name: 'fetch', value: unknown) => void,
  respond: (call: UpstreamCall) => Response | Promise<Response>,
): UpstreamCall[] {
  const calls: UpstreamCall[] = []
  stub('fetch', async (input: string | URL | Request, init: RequestInit = {}) => {
    const body = init.body == null ? new Uint8Array(0) : new Uint8Array(await new Response(init.body as BodyInit).arrayBuffer())
    const call: UpstreamCall = {
      url: String(input),
      method: init.method ?? 'GET',
      headers: new Headers(init.headers),
      body,
    }
    calls.push(call)
    const signal = init.signal
    if (signal?.aborted) throw signal.reason
    return await Promise.race([
      Promise.resolve(respond(call)),
      new Promise<never>((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason))),
    ])
  })
  return calls
}

export function fakeContext(): ExecutionContext & { settled(): Promise<void> } {
  const pending: Promise<unknown>[] = []
  return {
    waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    passThroughOnException: () => {},
    settled: async () => void (await Promise.allSettled(pending)),
  } as unknown as ExecutionContext & { settled(): Promise<void> }
}
