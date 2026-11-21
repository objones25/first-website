import { beforeAll, describe, expect, it } from 'vitest'
import { AuthError, bearerToken, verifySessionToken } from '../src/auth'
import { ISSUER, createTestKeys, hmacToken, tamper, unsignedToken, type TestKeys } from './helpers'

let keys: TestKeys
beforeAll(async () => {
  keys = await createTestKeys()
})

function verify(token: string) {
  return verifySessionToken(token, { issuer: ISSUER, jwks: keys.jwks })
}

describe('verifySessionToken', () => {
  it('returns the user id of a valid token', async () => {
    await expect(verify(await keys.sign())).resolves.toEqual({ userId: 'user_test123' })
  })

  it('accepts a token with no azp claim', async () => {
    await expect(verify(await keys.sign({ azp: null }))).resolves.toEqual({ userId: 'user_test123' })
  })

  it('accepts a localhost azp', async () => {
    await expect(verify(await keys.sign({ azp: 'http://localhost:3000' }))).resolves.toEqual({
      userId: 'user_test123',
    })
  })

  it.each([
    ['an empty string', async () => ''],
    ['a non-JWT string', async () => 'not-a-token'],
    ['an expired token', () => keys.sign({ expiresInSeconds: -120 })],
    ['a token that is not valid yet', () => keys.sign({ notBeforeInSeconds: 120 })],
    ['a token from another issuer', () => keys.sign({ issuer: 'https://clerk.evil.test' })],
    ['a token minted for another site', () => keys.sign({ azp: 'https://evil.test' })],
    ['a token with no expiry', () => keys.sign({ expiresInSeconds: null })],
    ['a token with no subject', () => keys.sign({ subject: null })],
    ['a token signed by an unknown key', () => keys.signWithOtherKey()],
    ['an unsigned token (alg none)', async () => unsignedToken()],
    ['an HS256 token', () => hmacToken()],
    ['a tampered payload', async () => tamper(await keys.sign())],
  ])('rejects %s', async (_name, make) => {
    await expect(verify(await make())).rejects.toBeInstanceOf(AuthError)
  })

  it('does not leak verification detail in the error message', async () => {
    await expect(verify(await keys.sign({ expiresInSeconds: -120 }))).rejects.toThrow(
      'Invalid or expired session token',
    )
  })
})

describe('bearerToken', () => {
  it('reads the token from an Authorization header', () => {
    expect(bearerToken(new Headers({ Authorization: 'Bearer abc.def.ghi' }))).toBe('abc.def.ghi')
  })

  it.each([undefined, '', 'abc.def.ghi', 'Basic abc', 'Bearer ', 'Bearer a b'])(
    'returns null for %j',
    (value) => {
      const headers = new Headers()
      if (value !== undefined) headers.set('Authorization', value)
      expect(bearerToken(headers)).toBeNull()
    },
  )
})
