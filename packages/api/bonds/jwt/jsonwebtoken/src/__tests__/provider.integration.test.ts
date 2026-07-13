/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual jsonwebtoken.
 *
 * The unit suite (`provider.test.ts`) mocks jsonwebtoken, so it can only validate OUR
 * assumptions about jsonwebtoken — not jsonwebtoken. These tests pin what a consumer
 * actually experiences: a real RS256 sign→verify roundtrip, the `clockTolerance` knob
 * that keeps slow-but-legitimate flows alive, DISTINGUISHABLE failures (expired vs
 * forged vs malformed vs algorithm confusion — each a different error the caller can
 * branch on), the bond's refusal to honor `ignoreExpiration`, and the documented truth
 * that `decode()` trusts anything. Every bond wrapping a pure-local dependency should
 * carry a file like this one; the unit mocks stay for shape/edge cases.
 *
 * @module
 */

import { generateKeyPairSync } from 'node:crypto'

import jsonwebtoken from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

import type { JwtPayload } from '@molecule/api-jwt'

import { provider } from '../provider.js'

const rsaPair = (): { privateKey: string; publicKey: string } =>
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

const { privateKey, publicKey } = rsaPair()

describe('@molecule/api-jwt-jsonwebtoken × REAL jsonwebtoken', () => {
  it('full lifecycle: sign RS256 → verify returns claims with the exact expiry → decode without a key', () => {
    const token = provider.sign(
      { sub: 'user-1', role: 'admin' },
      { algorithm: 'RS256', expiresIn: 3600 },
      privateKey,
    )
    expect(token.split('.')).toHaveLength(3)

    const claims = provider.verify(token, { algorithms: ['RS256'] }, publicKey) as JwtPayload
    expect(claims.sub).toBe('user-1')
    expect(claims.role).toBe('admin')
    // expiresIn really is seconds-from-iat — the contract core's JWT_EXPIRES_TIME relies on.
    expect(claims.exp).toBe((claims.iat as number) + 3600)

    // decode() needs no key at all — and therefore proves nothing about authenticity.
    const decoded = provider.decode(token) as JwtPayload
    expect(decoded.sub).toBe('user-1')
  })

  it('CONSUMER PROPERTY: clockTolerance keeps a just-expired token alive (slow flows / clock skew)', () => {
    // Deterministic: exp is 5s in the past at sign time; the test finishes long before
    // the 60s tolerance margin would matter. This is THE knob for "the login worked on
    // my machine but fails in CI/behind a skewed clock" — not ignoreExpiration.
    const justExpired = provider.sign(
      { sub: 'u' },
      { algorithm: 'RS256', expiresIn: -5 },
      privateKey,
    )

    expect(() => provider.verify(justExpired, { algorithms: ['RS256'] }, publicKey)).toThrow(
      jsonwebtoken.TokenExpiredError,
    )
    const tolerated = provider.verify(
      justExpired,
      { algorithms: ['RS256'], clockTolerance: 60 },
      publicKey,
    ) as JwtPayload
    expect(tolerated.sub).toBe('u')
  })

  it('SECURITY PROPERTY: the bond REFUSES ignoreExpiration — an expired token always fails', () => {
    // The core JwtVerifyOptions type exposes ignoreExpiration, but this bond force-sets
    // it false: expiry is not caller-bypassable. Documented in the core types JSDoc.
    const expired = provider.sign({ sub: 'u' }, { algorithm: 'RS256', expiresIn: -5 }, privateKey)
    expect(() =>
      provider.verify(expired, { algorithms: ['RS256'], ignoreExpiration: true }, publicKey),
    ).toThrow(jsonwebtoken.TokenExpiredError)
  })

  it('FAILURE DISAMBIGUATION: expired vs forged vs malformed vs alg-confusion are DIFFERENT errors', () => {
    const good = provider.sign({ sub: 'u' }, { algorithm: 'RS256', expiresIn: 3600 }, privateKey)

    // 1. Expired → TokenExpiredError (name 'TokenExpiredError') — "refresh the session".
    const expired = provider.sign({ sub: 'u' }, { algorithm: 'RS256', expiresIn: -5 }, privateKey)
    try {
      provider.verify(expired, { algorithms: ['RS256'] }, publicKey)
      expect.unreachable('expired token must not verify')
    } catch (error) {
      expect((error as Error).name).toBe('TokenExpiredError')
      expect((error as jsonwebtoken.TokenExpiredError).expiredAt).toBeInstanceOf(Date)
    }

    // 2. Signed by a DIFFERENT key (forged) → JsonWebTokenError 'invalid signature' — "reject".
    const stranger = rsaPair()
    const forged = provider.sign(
      { sub: 'u' },
      { algorithm: 'RS256', expiresIn: 3600 },
      stranger.privateKey,
    )
    expect(() => provider.verify(forged, { algorithms: ['RS256'] }, publicKey)).toThrow(
      /invalid signature/,
    )

    // 3. Not a JWT at all → 'jwt malformed' — "fix your wiring, this isn't a token".
    expect(() => provider.verify('not-a-jwt', { algorithms: ['RS256'] }, publicKey)).toThrow(
      /jwt malformed/,
    )

    // 4. Algorithm confusion: an HS256 token HMAC'd with the PUBLIC key must not pass an
    //    RS256-only verify — the algorithms allowlist blocks the classic downgrade attack.
    const confused = jsonwebtoken.sign({ sub: 'u' }, publicKey, { algorithm: 'HS256' })
    expect(() => provider.verify(confused, { algorithms: ['RS256'] }, publicKey)).toThrow(
      /invalid algorithm/,
    )

    // And the control: the good token still verifies after all that.
    expect((provider.verify(good, { algorithms: ['RS256'] }, publicKey) as JwtPayload).sub).toBe(
      'u',
    )
  })

  it('decode() happily returns claims from a token verify() rejects — never authorize from decode()', () => {
    const stranger = rsaPair()
    const forged = provider.sign(
      { sub: 'attacker', role: 'admin' },
      { algorithm: 'RS256', expiresIn: 3600 },
      stranger.privateKey,
    )
    // verify() rejects it…
    expect(() => provider.verify(forged, { algorithms: ['RS256'] }, publicKey)).toThrow()
    // …decode() returns the forged payload anyway — exactly why auth decisions must use verify().
    const decoded = provider.decode(forged) as JwtPayload
    expect(decoded.sub).toBe('attacker')
    expect(decoded.role).toBe('admin')
  })

  it('missing keys fail fast with actionable messages (not deep library errors)', () => {
    expect(() => provider.sign({ sub: 'u' }, { algorithm: 'RS256' })).toThrow(
      /private key is required/,
    )
    const token = provider.sign({ sub: 'u' }, { algorithm: 'RS256', expiresIn: 60 }, privateKey)
    expect(() => provider.verify(token, { algorithms: ['RS256'] })).toThrow(
      /public key is required/,
    )
  })

  it('re-signing verified claims requires stripping exp/iat — the raw payload throws', () => {
    // The refresh-flow gotcha documented in @molecule/api-jwt's @remarks: sign() with
    // expiresIn + a payload that still carries `exp` is an ERROR in jsonwebtoken.
    const token = provider.sign({ sub: 'u' }, { algorithm: 'RS256', expiresIn: 3600 }, privateKey)
    const claims = provider.verify(token, { algorithms: ['RS256'] }, publicKey) as JwtPayload

    expect(() =>
      provider.sign(
        claims as Record<string, string | number>,
        { algorithm: 'RS256', expiresIn: 3600 },
        privateKey,
      ),
    ).toThrow(/expiresIn.*exp/)

    // Strip the timestamps and the same claims re-sign cleanly.
    const { exp: _exp, iat: _iat, ...rest } = claims
    const refreshed = provider.sign(
      rest as Record<string, string | number>,
      { algorithm: 'RS256', expiresIn: 3600 },
      privateKey,
    )
    expect(
      (provider.verify(refreshed, { algorithms: ['RS256'] }, publicKey) as JwtPayload).sub,
    ).toBe('u')
  })
})
