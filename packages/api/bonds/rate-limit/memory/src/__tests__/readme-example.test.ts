/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real rate-limit core.
 * The provider is pure in-memory, so nothing is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { configure, consume, setProvider } from '@molecule/api-rate-limit'

import { provider } from '../index.js'

describe('README @example', () => {
  it('allows max attempts per window, then rejects with retryAfter in seconds', async () => {
    setProvider(provider)
    configure({ windowMs: 60_000, max: 5, keyPrefix: 'myapp' })

    const attemptLogin = async (
      email: string,
    ): Promise<{ status: number; retryAfter?: number; remaining?: number }> => {
      const limit = await consume(`login:${email.toLowerCase()}`)
      if (!limit.allowed) return { status: 429, retryAfter: limit.retryAfter }
      return { status: 200, remaining: limit.remaining }
    }

    const results = []
    for (let attempt = 0; attempt < 6; attempt++)
      results.push(await attemptLogin('Ada@example.com'))

    expect(results[0]).toEqual({ status: 200, remaining: 4 })
    expect(results[4]).toEqual({ status: 200, remaining: 0 })
    expect(results[5]).toEqual({ status: 429, retryAfter: 60 })
    // A different identifier has its own bucket.
    expect(await attemptLogin('grace@example.com')).toEqual({ status: 200, remaining: 4 })
  })
})
