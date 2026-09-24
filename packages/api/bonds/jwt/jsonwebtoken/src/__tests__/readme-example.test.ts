/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real jsonwebtoken, real RSA keys
 * supplied through `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` before the core loads.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { type JwtPayload, setProvider, sign, verify } from '@molecule/api-jwt'

import { provider } from '../index.js'

vi.hoisted(async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  process.env.JWT_PRIVATE_KEY = privateKey
  process.env.JWT_PUBLIC_KEY = publicKey
})

describe('README @example', () => {
  it('signs and verifies a custom link token through the core', () => {
    setProvider(provider)

    const token = sign({ purpose: 'password-reset', userId: 'u_123' }, { expiresIn: '30m' })

    function readResetToken(candidate: string): string | null {
      try {
        const claims = verify(candidate) as JwtPayload
        return claims.purpose === 'password-reset' && typeof claims.userId === 'string'
          ? claims.userId
          : null
      } catch (_error) {
        // Expired, forged or malformed link — the caller shows "link invalid".
        return null
      }
    }

    expect(readResetToken(token)).toBe('u_123')
    expect(readResetToken(`${token}x`)).toBeNull()

    const claims = verify(token) as JwtPayload
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(30 * 60)
  })
})
