/**
 * Tests for Microsoft OAuth JWKS caching + RS256 ID-token verification.
 *
 * Uses a real RSA keypair (Node `crypto`) and signs tokens at test time
 * — no third-party JOSE library, no fake signatures.
 *
 * @module
 */

import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()

vi.mock('@molecule/api-http', () => ({
  post: vi.fn(),
  get: mockGet,
}))

vi.mock('@molecule/api-oauth', () => ({}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const base64Url = (input: string | Buffer): string => {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

interface KeyPair {
  privateKey: KeyObject
  publicKey: KeyObject
}

let keyA: KeyPair
let keyB: KeyPair

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  keyA = generateKeyPairSync('rsa', { modulusLength: 2048 })
  keyB = generateKeyPairSync('rsa', { modulusLength: 2048 })
})

afterEach(() => {
  vi.useRealTimers()
})

interface JwkRsa {
  kty: string
  n?: string
  e?: string
}

const jwkFor = (key: KeyObject, kid: string): Record<string, string> => {
  const jwk = key.export({ format: 'jwk' }) as JwkRsa
  return {
    kty: jwk.kty,
    kid,
    n: jwk.n!,
    e: jwk.e!,
    alg: 'RS256',
    use: 'sig',
  }
}

interface SignTokenOptions {
  privateKey: KeyObject
  kid: string
  payload: Record<string, unknown>
  alg?: string
}

const signRs256 = ({ privateKey, kid, payload, alg = 'RS256' }: SignTokenOptions): string => {
  const header = base64Url(JSON.stringify({ alg, kid, typ: 'JWT' }))
  const body = base64Url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  signer.end()
  const sig = base64Url(signer.sign(privateKey))
  return `${signingInput}.${sig}`
}

describe('JWKS cache + ID-token verification', () => {
  const tenant = 'common'
  const audience = 'test-ms-client-id'
  const validIss = `https://login.microsoftonline.com/${tenant}/v2.0`
  const nowSec = 1_700_000_000

  it('verifies a well-formed RS256 token signed with a known JWK', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: validIss,
        aud: audience,
        sub: 'oid-1',
        exp: nowSec + 600,
        iat: nowSec - 60,
        email: 'alice@contoso.com',
        name: 'Alice',
        tid: tenant,
      },
    })
    const claims = await verifyMicrosoftIdToken(
      token,
      { tenantId: tenant, audience },
      { now: () => nowSec },
    )
    expect(claims.sub).toBe('oid-1')
    expect(claims.email).toBe('alice@contoso.com')
    expect(claims.iss).toBe(validIss)
    expect(claims.aud).toBe(audience)
  })

  it('caches JWKS for 1 hour and refreshes after the TTL', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { getJwks, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    let now = 1_000
    await getJwks(tenant, { now: () => now })
    await getJwks(tenant, { now: () => now + 60_000 })
    expect(mockGet).toHaveBeenCalledTimes(1)
    now = now + 60 * 60 * 1000 + 1
    await getJwks(tenant, { now: () => now })
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('refreshes JWKS when the kid is unknown', async () => {
    // First fetch returns a stale set; second (forced) fetch returns the
    // real key.
    mockGet
      .mockResolvedValueOnce({
        data: { keys: [jwkFor(keyB.publicKey, 'kid-old')] },
      })
      .mockResolvedValueOnce({
        data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
      })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: validIss,
        aud: audience,
        sub: 'oid-2',
        exp: nowSec + 600,
        iat: nowSec - 60,
      },
    })
    const claims = await verifyMicrosoftIdToken(
      token,
      { tenantId: tenant, audience },
      { now: () => nowSec },
    )
    expect(claims.sub).toBe('oid-2')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('rejects a token signed by a different key (signature mismatch)', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    // Sign with keyB, but advertise kid-A so JWKS lookup finds keyA.
    const forged = signRs256({
      privateKey: keyB.privateKey,
      kid: 'kid-A',
      payload: {
        iss: validIss,
        aud: audience,
        sub: 'oid-3',
        exp: nowSec + 600,
        iat: nowSec - 60,
      },
    })
    await expect(
      verifyMicrosoftIdToken(
        forged,
        { tenantId: tenant, audience },
        { now: () => nowSec, refreshOnMiss: false },
      ),
    ).rejects.toThrow(/signature/i)
  })

  it('rejects an expired token', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: validIss,
        aud: audience,
        sub: 'oid-4',
        exp: nowSec - 1,
        iat: nowSec - 600,
      },
    })
    await expect(
      verifyMicrosoftIdToken(token, { tenantId: tenant, audience }, { now: () => nowSec }),
    ).rejects.toThrow(/expired/i)
  })

  it('rejects a token with the wrong audience', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: validIss,
        aud: 'someone-else',
        sub: 'oid-5',
        exp: nowSec + 600,
        iat: nowSec - 60,
      },
    })
    await expect(
      verifyMicrosoftIdToken(token, { tenantId: tenant, audience }, { now: () => nowSec }),
    ).rejects.toThrow(/audience/i)
  })

  it('rejects a token with an unexpected issuer', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: 'https://evil.example.com/v2.0',
        aud: audience,
        sub: 'oid-6',
        exp: nowSec + 600,
        iat: nowSec - 60,
      },
    })
    await expect(
      verifyMicrosoftIdToken(token, { tenantId: tenant, audience }, { now: () => nowSec }),
    ).rejects.toThrow(/issuer/i)
  })

  it('accepts a templated tenant issuer when the token tid resolves a single-tenant issuer', async () => {
    mockGet.mockResolvedValue({
      data: { keys: [jwkFor(keyA.publicKey, 'kid-A')] },
    })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const tokenTid = '11111111-2222-3333-4444-555555555555'
    const token = signRs256({
      privateKey: keyA.privateKey,
      kid: 'kid-A',
      payload: {
        iss: `https://login.microsoftonline.com/${tokenTid}/v2.0`,
        aud: audience,
        sub: 'oid-7',
        exp: nowSec + 600,
        iat: nowSec - 60,
        tid: tokenTid,
      },
    })
    const claims = await verifyMicrosoftIdToken(
      token,
      { tenantId: 'common', audience },
      { now: () => nowSec },
    )
    expect(claims.tid).toBe(tokenTid)
  })

  it('rejects a token with a non-RS256 alg (e.g., none)', async () => {
    mockGet.mockResolvedValue({ data: { keys: [] } })
    const { verifyMicrosoftIdToken, clearJwksCache } = await import('../jwks.js')
    clearJwksCache()
    const header = base64Url(JSON.stringify({ alg: 'none', kid: 'kid-A', typ: 'JWT' }))
    const body = base64Url(
      JSON.stringify({
        iss: validIss,
        aud: audience,
        sub: 'oid-8',
        exp: nowSec + 600,
        iat: nowSec - 60,
      }),
    )
    const token = `${header}.${body}.`
    await expect(
      verifyMicrosoftIdToken(token, { tenantId: tenant, audience }, { now: () => nowSec }),
    ).rejects.toThrow(/alg/i)
  })

  it('rejects a malformed token', async () => {
    const { verifyMicrosoftIdToken } = await import('../jwks.js')
    await expect(
      verifyMicrosoftIdToken('not-a-jwt', { tenantId: tenant, audience }),
    ).rejects.toThrow(/three segments/)
  })
})
