/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the real bcryptjs bond (pure
 * JS, no mocks).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider as bcrypt } from '@molecule/api-password-bcrypt'

import { compare, hash, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('bonds bcrypt, hashes on sign-up, and compares on log-in', async () => {
    // Lowest allowed cost keeps the test fast; the code path is the example's default.
    vi.stubEnv('SALT_ROUNDS', '10')

    setProvider(bcrypt)

    const signupPassword = 'correct horse battery staple'
    const passwordHash = await hash(signupPassword)
    expect(passwordHash).toMatch(/^\$2[aby]\$10\$/)
    expect(passwordHash).not.toContain(signupPassword)

    const loginPassword = 'correct horse battery staple'
    const ok = await compare(loginPassword, passwordHash)
    expect(ok).toBe(true)
    expect(await compare('wrong password', passwordHash)).toBe(false)
  })
})
