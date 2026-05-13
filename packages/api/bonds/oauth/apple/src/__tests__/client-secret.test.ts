import { generateKeyPairSync } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS,
  APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS,
  createAppleClientSecret,
} from '../client-secret.js'

/**
 * Generate a fresh ES256 P-256 EC private key in PEM format for every
 * test run — Apple's client-secret JWT requires ES256.
 */
function generateEs256Pem(): string {
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  return privateKey
}

const VALID_INPUT = (privateKey: string) => ({
  teamId: 'TEAM12345',
  clientId: 'com.example.app',
  keyId: 'KEY1234567',
  privateKey,
})

describe('APPLE_CLIENT_SECRET_* constants', () => {
  it('default lifetime is 300 seconds (5 minutes)', () => {
    expect(APPLE_CLIENT_SECRET_DEFAULT_LIFETIME_SECONDS).toBe(300)
  })

  it('max lifetime is 15777000 seconds (~6 months per Apple)', () => {
    expect(APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS).toBe(15777000)
  })
})

describe('createAppleClientSecret — input validation', () => {
  const pem = generateEs256Pem()

  it('throws when teamId is missing/empty', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), teamId: '' })).toThrow(
      /teamId, clientId, keyId, and privateKey/,
    )
  })

  it('throws when clientId is missing/empty', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), clientId: '' })).toThrow(
      /teamId, clientId, keyId, and privateKey/,
    )
  })

  it('throws when keyId is missing/empty', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), keyId: '' })).toThrow(
      /teamId, clientId, keyId, and privateKey/,
    )
  })

  it('throws when privateKey is missing/empty', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), privateKey: '' })).toThrow(
      /teamId, clientId, keyId, and privateKey/,
    )
  })

  it('throws on zero lifetime', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), lifetimeSeconds: 0 })).toThrow(
      /lifetimeSeconds must be > 0/,
    )
  })

  it('throws on negative lifetime', () => {
    expect(() => createAppleClientSecret({ ...VALID_INPUT(pem), lifetimeSeconds: -1 })).toThrow(
      /lifetimeSeconds must be > 0/,
    )
  })

  it('throws when lifetime exceeds Apple max (6 months)', () => {
    expect(() =>
      createAppleClientSecret({
        ...VALID_INPUT(pem),
        lifetimeSeconds: APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS + 1,
      }),
    ).toThrow(/lifetimeSeconds must be > 0/)
  })

  it('accepts lifetime at exactly the max', () => {
    expect(() =>
      createAppleClientSecret({
        ...VALID_INPUT(pem),
        lifetimeSeconds: APPLE_CLIENT_SECRET_MAX_LIFETIME_SECONDS,
      }),
    ).not.toThrow()
  })

  it('throws sanitized error when private key is malformed (no key data in message)', () => {
    const malformed = 'NOT-A-REAL-PEM'
    try {
      createAppleClientSecret({ ...VALID_INPUT(pem), privateKey: malformed })
      throw new Error('did not throw')
    } catch (err) {
      const msg = (err as Error).message
      expect(msg).toMatch(/Failed to sign Apple client-secret JWT/)
      // Critically: the malformed key body must NOT appear in the error
      // message — preventing key leakage in logs.
      expect(msg).not.toContain(malformed)
    }
  })
})

describe('createAppleClientSecret — signing', () => {
  const pem = generateEs256Pem()

  it('returns a compact-serialized JWT (3 base64url segments)', () => {
    const jwt = createAppleClientSecret(VALID_INPUT(pem))
    const segments = jwt.split('.')
    expect(segments).toHaveLength(3)
    for (const seg of segments) {
      expect(seg.length).toBeGreaterThan(0)
    }
  })

  function decodeSegment(segment: string): Record<string, unknown> {
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4)
    const buf = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    return JSON.parse(buf.toString('utf-8')) as Record<string, unknown>
  }

  it('header has alg=ES256 + kid=keyId', () => {
    const jwt = createAppleClientSecret(VALID_INPUT(pem))
    const header = decodeSegment(jwt.split('.')[0]!)
    expect(header.alg).toBe('ES256')
    expect(header.kid).toBe('KEY1234567')
  })

  it('payload has iss=teamId, sub=clientId, aud=appleid.apple.com', () => {
    const jwt = createAppleClientSecret(VALID_INPUT(pem))
    const payload = decodeSegment(jwt.split('.')[1]!)
    expect(payload.iss).toBe('TEAM12345')
    expect(payload.sub).toBe('com.example.app')
    expect(payload.aud).toBe('https://appleid.apple.com')
  })

  it('payload has iat ≈ now and exp = iat + lifetimeSeconds (default 300s)', () => {
    const before = Math.floor(Date.now() / 1000)
    const jwt = createAppleClientSecret(VALID_INPUT(pem))
    const after = Math.floor(Date.now() / 1000)
    const payload = decodeSegment(jwt.split('.')[1]!) as { iat: number; exp: number }
    expect(payload.iat).toBeGreaterThanOrEqual(before)
    expect(payload.iat).toBeLessThanOrEqual(after)
    expect(payload.exp).toBe(payload.iat + 300) // default
  })

  it('payload exp respects custom lifetimeSeconds', () => {
    const jwt = createAppleClientSecret({ ...VALID_INPUT(pem), lifetimeSeconds: 600 })
    const payload = decodeSegment(jwt.split('.')[1]!) as { iat: number; exp: number }
    expect(payload.exp).toBe(payload.iat + 600)
  })

  it('accepts an env-style PEM with literal \\n escapes (single-line var)', () => {
    // Apps that ship the PEM through .env vars often end up with literal
    // backslash-n in place of newlines. Verify the un-escape works.
    const singleLine = pem.replace(/\n/g, '\\n')
    expect(() =>
      createAppleClientSecret({ ...VALID_INPUT(pem), privateKey: singleLine }),
    ).not.toThrow()
  })
})
