import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RateLimitProvider } from '@molecule/api-rate-limit'

import { provider } from '../provider.js'

describe('@molecule/api-rate-limit-memory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    provider.configure({ windowMs: 60_000, max: 10 })
  })

  afterEach(async () => {
    // Clean up state between tests
    await provider.reset('test-key')
    await provider.reset('key-a')
    await provider.reset('key-b')
    vi.useRealTimers()
  })

  it('conforms to the RateLimitProvider interface', () => {
    const p: RateLimitProvider = provider
    expect(typeof p.check).toBe('function')
    expect(typeof p.consume).toBe('function')
    expect(typeof p.reset).toBe('function')
    expect(typeof p.getRemaining).toBe('function')
    expect(typeof p.configure).toBe('function')
  })

  describe('check', () => {
    it('returns allowed=true for a fresh key', async () => {
      const result = await provider.check('test-key')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
      expect(result.total).toBe(10)
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.retryAfter).toBeUndefined()
    })

    it('does not consume tokens', async () => {
      await provider.check('test-key')
      await provider.check('test-key')
      await provider.check('test-key')
      const remaining = await provider.getRemaining('test-key')
      expect(remaining).toBe(10)
    })

    it('returns allowed=false when limit is exhausted', async () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await provider.consume('test-key')
      }
      const result = await provider.check('test-key')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('consume', () => {
    it('decrements remaining tokens', async () => {
      const result = await provider.consume('test-key')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.total).toBe(10)
    })

    it('rejects when limit is reached', async () => {
      for (let i = 0; i < 10; i++) {
        await provider.consume('test-key')
      }
      const result = await provider.consume('test-key')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('supports custom cost', async () => {
      const result = await provider.consume('test-key', 5)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('rejects when cost exceeds remaining', async () => {
      await provider.consume('test-key', 8)
      const result = await provider.consume('test-key', 5)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(2)
    })

    it('defaults cost to 1', async () => {
      await provider.consume('test-key')
      const remaining = await provider.getRemaining('test-key')
      expect(remaining).toBe(9)
    })
  })

  describe('reset', () => {
    it('clears the bucket for a key', async () => {
      await provider.consume('test-key', 5)
      expect(await provider.getRemaining('test-key')).toBe(5)

      await provider.reset('test-key')
      expect(await provider.getRemaining('test-key')).toBe(10)
    })

    it('does not affect other keys', async () => {
      await provider.consume('key-a', 3)
      await provider.consume('key-b', 7)

      await provider.reset('key-a')
      expect(await provider.getRemaining('key-a')).toBe(10)
      expect(await provider.getRemaining('key-b')).toBe(3)
    })
  })

  describe('getRemaining', () => {
    it('returns max for a fresh key', async () => {
      expect(await provider.getRemaining('test-key')).toBe(10)
    })

    it('returns correct count after consumption', async () => {
      await provider.consume('test-key', 3)
      expect(await provider.getRemaining('test-key')).toBe(7)
    })

    it('returns 0 when fully consumed', async () => {
      await provider.consume('test-key', 10)
      expect(await provider.getRemaining('test-key')).toBe(0)
    })
  })

  describe('configure', () => {
    it('updates window and max settings', async () => {
      provider.configure({ windowMs: 30_000, max: 5 })
      const result = await provider.check('test-key')
      expect(result.total).toBe(5)
      expect(result.remaining).toBe(5)
    })

    it('applies keyPrefix to all subsequent operations', async () => {
      provider.configure({ windowMs: 60_000, max: 10, keyPrefix: 'api' })
      await provider.consume('test-key', 3)
      expect(await provider.getRemaining('test-key')).toBe(7)

      // Reset prefix and check the raw key is untouched
      provider.configure({ windowMs: 60_000, max: 10, keyPrefix: undefined })
      expect(await provider.getRemaining('test-key')).toBe(10)
    })
  })

  describe('window expiry', () => {
    it('resets bucket after window expires', async () => {
      await provider.consume('test-key', 10)
      expect(await provider.getRemaining('test-key')).toBe(0)

      // Advance past the window
      vi.advanceTimersByTime(61_000)

      expect(await provider.getRemaining('test-key')).toBe(10)
    })

    it('provides correct resetAt timestamp', async () => {
      const now = Date.now()
      const result = await provider.consume('test-key')
      const expectedReset = now + 60_000
      expect(result.resetAt.getTime()).toBeCloseTo(expectedReset, -2)
    })
  })

  describe('key isolation', () => {
    it('tracks separate keys independently', async () => {
      await provider.consume('key-a', 2)
      await provider.consume('key-b', 8)

      expect(await provider.getRemaining('key-a')).toBe(8)
      expect(await provider.getRemaining('key-b')).toBe(2)
    })
  })
})
