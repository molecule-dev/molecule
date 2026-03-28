import { describe, expect, it } from 'vitest'

import type { RateLimitOptions, RateLimitProvider, RateLimitResult } from '../types.js'

describe('rate-limit types', () => {
  it('should export RateLimitOptions type', () => {
    const options: RateLimitOptions = {
      windowMs: 60_000,
      max: 100,
      keyPrefix: 'api:',
      skipFailedRequests: true,
      skipSuccessfulRequests: false,
    }
    expect(options.windowMs).toBe(60_000)
    expect(options.max).toBe(100)
  })

  it('should export RateLimitResult type', () => {
    const result: RateLimitResult = {
      allowed: true,
      remaining: 99,
      total: 100,
      resetAt: new Date(),
    }
    expect(result.allowed).toBe(true)
    expect(result.retryAfter).toBeUndefined()
  })

  it('should export RateLimitResult type with retryAfter', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      total: 100,
      resetAt: new Date(),
      retryAfter: 30,
    }
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBe(30)
  })

  it('should export RateLimitProvider type with all required methods', () => {
    const provider: RateLimitProvider = {
      check: async (_key: string) => ({
        allowed: true,
        remaining: 99,
        total: 100,
        resetAt: new Date(),
      }),
      consume: async (_key: string, _cost?: number) => ({
        allowed: true,
        remaining: 98,
        total: 100,
        resetAt: new Date(),
      }),
      reset: async (_key: string) => {},
      getRemaining: async (_key: string) => 99,
      configure: (_options: RateLimitOptions) => {},
    }
    expect(typeof provider.check).toBe('function')
    expect(typeof provider.consume).toBe('function')
    expect(typeof provider.reset).toBe('function')
    expect(typeof provider.getRemaining).toBe('function')
    expect(typeof provider.configure).toBe('function')
  })

  it('should support minimal RateLimitOptions', () => {
    const options: RateLimitOptions = {
      windowMs: 1000,
      max: 10,
    }
    expect(options.keyPrefix).toBeUndefined()
    expect(options.skipFailedRequests).toBeUndefined()
    expect(options.skipSuccessfulRequests).toBeUndefined()
  })
})
