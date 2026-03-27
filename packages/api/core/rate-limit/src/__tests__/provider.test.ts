import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { RateLimitProvider, RateLimitResult } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let check: typeof ProviderModule.check
let consume: typeof ProviderModule.consume
let reset: typeof ProviderModule.reset
let getRemaining: typeof ProviderModule.getRemaining
let configure: typeof ProviderModule.configure

const makeResult = (overrides?: Partial<RateLimitResult>): RateLimitResult => ({
  allowed: true,
  remaining: 99,
  total: 100,
  resetAt: new Date('2026-01-01T00:01:00Z'),
  ...overrides,
})

const makeMockProvider = (overrides?: Partial<RateLimitProvider>): RateLimitProvider => ({
  check: vi.fn().mockResolvedValue(makeResult()),
  consume: vi.fn().mockResolvedValue(makeResult({ remaining: 98 })),
  reset: vi.fn().mockResolvedValue(undefined),
  getRemaining: vi.fn().mockResolvedValue(99),
  configure: vi.fn(),
  ...overrides,
})

describe('rate-limit provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    check = providerModule.check
    consume = providerModule.consume
    reset = providerModule.reset
    getRemaining = providerModule.getRemaining
    configure = providerModule.configure
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Rate-limit provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('check', () => {
    it('should throw when no provider is set', async () => {
      await expect(check('key')).rejects.toThrow('Rate-limit provider not configured')
    })

    it('should delegate to provider check', async () => {
      const expected = makeResult()
      const mockCheck = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ check: mockCheck }))

      const result = await check('user:123')

      expect(mockCheck).toHaveBeenCalledWith('user:123')
      expect(result).toBe(expected)
    })
  })

  describe('consume', () => {
    it('should throw when no provider is set', async () => {
      await expect(consume('key')).rejects.toThrow('Rate-limit provider not configured')
    })

    it('should delegate to provider consume with default cost', async () => {
      const expected = makeResult({ remaining: 98 })
      const mockConsume = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ consume: mockConsume }))

      const result = await consume('user:123')

      expect(mockConsume).toHaveBeenCalledWith('user:123', undefined)
      expect(result).toBe(expected)
    })

    it('should delegate to provider consume with custom cost', async () => {
      const expected = makeResult({ remaining: 95 })
      const mockConsume = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ consume: mockConsume }))

      const result = await consume('user:123', 5)

      expect(mockConsume).toHaveBeenCalledWith('user:123', 5)
      expect(result).toBe(expected)
    })

    it('should return disallowed result when limit exceeded', async () => {
      const expected = makeResult({
        allowed: false,
        remaining: 0,
        retryAfter: 30,
      })
      const mockConsume = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ consume: mockConsume }))

      const result = await consume('user:123')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBe(30)
    })
  })

  describe('reset', () => {
    it('should throw when no provider is set', async () => {
      await expect(reset('key')).rejects.toThrow('Rate-limit provider not configured')
    })

    it('should delegate to provider reset', async () => {
      const mockReset = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ reset: mockReset }))

      await reset('user:123')

      expect(mockReset).toHaveBeenCalledWith('user:123')
    })
  })

  describe('getRemaining', () => {
    it('should throw when no provider is set', async () => {
      await expect(getRemaining('key')).rejects.toThrow('Rate-limit provider not configured')
    })

    it('should delegate to provider getRemaining', async () => {
      const mockGetRemaining = vi.fn().mockResolvedValue(42)
      setProvider(makeMockProvider({ getRemaining: mockGetRemaining }))

      const result = await getRemaining('user:123')

      expect(mockGetRemaining).toHaveBeenCalledWith('user:123')
      expect(result).toBe(42)
    })
  })

  describe('configure', () => {
    it('should throw when no provider is set', () => {
      expect(() => configure({ windowMs: 60_000, max: 100 })).toThrow(
        'Rate-limit provider not configured',
      )
    })

    it('should delegate to provider configure', () => {
      const mockConfigure = vi.fn()
      setProvider(makeMockProvider({ configure: mockConfigure }))

      const options = { windowMs: 60_000, max: 100, keyPrefix: 'api:' }
      configure(options)

      expect(mockConfigure).toHaveBeenCalledWith(options)
    })
  })
})
