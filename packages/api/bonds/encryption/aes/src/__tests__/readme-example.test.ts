/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Nothing is mocked — AES-256-GCM runs
 * on Node's built-in `crypto`.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { decrypt, encrypt, setProvider } from '@molecule/api-encryption'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'a'.repeat(64) }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('encrypts and decrypts a field with a matching context', async () => {
    const key = process.env.ENCRYPTION_KEY
    if (!key) throw new Error('ENCRYPTION_KEY is not set')
    setProvider(createProvider({ key }))

    const stored = await encrypt('4111 1111 1111 1111', 'user:42:card')
    expect(stored).toMatch(/^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/)
    expect(stored).not.toContain('4111')

    const card = await decrypt(stored, 'user:42:card')
    expect(card).toBe('4111 1111 1111 1111')

    await expect(decrypt(stored, 'user:43:card')).rejects.toThrow()
  })
})
