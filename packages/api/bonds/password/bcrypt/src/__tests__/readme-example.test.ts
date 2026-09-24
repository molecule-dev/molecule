/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written, against the real bcryptjs (pure JS — nothing
 * to stub). `SALT_ROUNDS` is pinned to the minimum clamp (10) to keep it fast.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { compare, hash, setProvider } from '@molecule/api-password'

import { provider as bcrypt } from '../index.js'

describe('README @example', () => {
  const originalSaltRounds = process.env.SALT_ROUNDS

  beforeEach(() => {
    process.env.SALT_ROUNDS = '10'
  })

  afterEach(() => {
    if (originalSaltRounds === undefined) delete process.env.SALT_ROUNDS
    else process.env.SALT_ROUNDS = originalSaltRounds
  })

  it('hashes a password and compares right and wrong passwords', async () => {
    setProvider(bcrypt)

    const passwordHash = await hash('correct horse battery staple')
    const ok = await compare('correct horse battery staple', passwordHash)
    const wrong = await compare('Tr0ub4dor&3', passwordHash)

    expect(passwordHash).toMatch(/^\$2[aby]\$10\$/)
    expect(passwordHash).not.toContain('correct horse')
    expect(ok).toBe(true)
    expect(wrong).toBe(false)
  })
})
