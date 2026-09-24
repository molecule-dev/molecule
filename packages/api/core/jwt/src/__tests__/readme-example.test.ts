/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real jsonwebtoken bond.
 * A throwaway RSA key pair is supplied via `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`
 * (so nothing is written to disk); nothing else is mocked.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

await vi.hoisted(async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  process.env.JWT_PRIVATE_KEY = privateKey
  process.env.JWT_PUBLIC_KEY = publicKey
})

import { provider } from '@molecule/api-jwt-jsonwebtoken'
import { logger } from '@molecule/api-logger'

import type { JwtPayload } from '../index.js'
import { decode, setProvider, sign, verify } from '../index.js'

describe('README @example', () => {
  it('bonds jsonwebtoken, signs a custom token, verifies it and rejects tampering', () => {
    setProvider(provider)

    const token = sign({ purpose: 'email-verify', userId: 'u_123' }, { expiresIn: '15m' })

    function readVerifyToken(candidate: string): string | null {
      try {
        const claims = verify(candidate) as JwtPayload
        return claims.purpose === 'email-verify' && typeof claims.userId === 'string'
          ? claims.userId
          : null
      } catch (error) {
        logger.debug('email-verify token rejected', { error })
        return null
      }
    }

    const userId = readVerifyToken(token)
    expect(userId).toBe('u_123')

    const peek = decode(token) as JwtPayload
    expect(peek.userId).toBe('u_123')
    expect((peek.exp ?? 0) - (peek.iat ?? 0)).toBe(15 * 60)

    // A forged payload with the original signature fails verification.
    const [header, , signature] = token.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ purpose: 'email-verify', userId: 'admin' }),
    ).toString('base64url')
    expect(readVerifyToken(`${header}.${forgedBody}.${signature}`)).toBeNull()
  })
})
