const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@molecule/api-http', () => ({
  get: mockGet,
}))

import { generateKeyPairSync } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  APPLE_JWKS_URL,
  type AppleJwk,
  getAppleJwks,
  JWKS_CACHE_TTL_MS,
  jwkToPem,
  resetJwksCache,
} from '../jwks.js'

/**
 * Generate an RS256 RSA key + return its JWK + matching public-key fields.
 * Apple signs ID tokens with RS256.
 */
function generateAppleJwk(kid: string): AppleJwk {
  const { publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })
  const jwk = publicKey.export({ format: 'jwk' }) as { n: string; e: string }
  return {
    kty: 'RSA',
    kid,
    use: 'sig',
    alg: 'RS256',
    n: jwk.n,
    e: jwk.e,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  resetJwksCache()
})

describe('APPLE_JWKS_URL + JWKS_CACHE_TTL_MS constants', () => {
  it('points to the canonical Apple JWKS endpoint', () => {
    expect(APPLE_JWKS_URL).toBe('https://appleid.apple.com/auth/keys')
  })

  it('TTL is 1 hour in milliseconds', () => {
    expect(JWKS_CACHE_TTL_MS).toBe(60 * 60 * 1000)
  })
})

describe('getAppleJwks — fetch + cache', () => {
  it('fetches the JWKS once and caches by kid', async () => {
    const jwk1 = generateAppleJwk('key-a')
    const jwk2 = generateAppleJwk('key-b')
    mockGet.mockResolvedValueOnce({ data: { keys: [jwk1, jwk2] } })

    const result = await getAppleJwks()
    expect(result.size).toBe(2)
    expect(result.get('key-a')).toEqual(jwk1)
    expect(result.get('key-b')).toEqual(jwk2)
    expect(mockGet).toHaveBeenCalledExactlyOnceWith(APPLE_JWKS_URL, expect.any(Object))
  })

  it('uses cached map on repeated calls within the TTL', async () => {
    const jwk = generateAppleJwk('key-a')
    mockGet.mockResolvedValueOnce({ data: { keys: [jwk] } })
    await getAppleJwks()
    await getAppleJwks() // should NOT refetch
    await getAppleJwks()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetches when the cache has expired', async () => {
    const jwk1 = generateAppleJwk('key-a')
    const jwk2 = generateAppleJwk('key-b')
    mockGet
      .mockResolvedValueOnce({ data: { keys: [jwk1] } })
      .mockResolvedValueOnce({ data: { keys: [jwk2] } })

    await getAppleJwks()
    // Advance Date.now beyond the TTL window
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + JWKS_CACHE_TTL_MS + 1)
    try {
      const fresh = await getAppleJwks()
      expect(fresh.get('key-b')).toEqual(jwk2)
      expect(fresh.has('key-a')).toBe(false) // replaced, not merged
      expect(mockGet).toHaveBeenCalledTimes(2)
    } finally {
      dateNowSpy.mockRestore()
    }
  })

  it('skips JWK entries without a kid (data hygiene)', async () => {
    const valid = generateAppleJwk('keep')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noKid: any = { ...generateAppleJwk('drop'), kid: '' }
    mockGet.mockResolvedValueOnce({ data: { keys: [valid, noKid] } })
    const out = await getAppleJwks()
    expect(out.size).toBe(1)
    expect(out.has('keep')).toBe(true)
  })

  it('returns an empty map when the response data is missing/empty', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined })
    const out = await getAppleJwks()
    expect(out.size).toBe(0)
  })

  it('returns an empty map when the keys field is missing', async () => {
    mockGet.mockResolvedValueOnce({ data: {} })
    const out = await getAppleJwks()
    expect(out.size).toBe(0)
  })

  it('passes accept: application/json header + 15s timeout', async () => {
    mockGet.mockResolvedValueOnce({ data: { keys: [] } })
    await getAppleJwks()
    expect(mockGet.mock.calls[0][1]).toMatchObject({
      headers: { accept: 'application/json' },
      timeout: 15_000,
    })
  })
})

describe('resetJwksCache', () => {
  it('forces the next getAppleJwks call to refetch', async () => {
    const jwk = generateAppleJwk('a')
    mockGet.mockResolvedValue({ data: { keys: [jwk] } })
    await getAppleJwks()
    resetJwksCache()
    await getAppleJwks()
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})

describe('jwkToPem', () => {
  it('returns a PEM-formatted public-key string', () => {
    const jwk = generateAppleJwk('any')
    const pem = jwkToPem(jwk)
    expect(pem.startsWith('-----BEGIN PUBLIC KEY-----')).toBe(true)
    expect(pem.trim().endsWith('-----END PUBLIC KEY-----')).toBe(true)
  })

  it('produces a deterministic PEM for the same JWK (no signing involved)', () => {
    const jwk = generateAppleJwk('det')
    const a = jwkToPem(jwk)
    const b = jwkToPem(jwk)
    expect(a).toBe(b)
  })

  it('produces different PEMs for different JWKs', () => {
    const a = jwkToPem(generateAppleJwk('a'))
    const b = jwkToPem(generateAppleJwk('b'))
    expect(a).not.toBe(b)
  })

  it('throws on completely malformed JWK (wrong kty)', () => {
    expect(() => jwkToPem({ kty: 'NOT-A-KEY-TYPE' } as AppleJwk)).toThrow()
  })
})
