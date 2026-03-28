import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RateLimitProvider } from '@molecule/api-rate-limit'

// Mock ioredis before importing
const mockZremrangebyscore = vi.fn()
const mockZcard = vi.fn()
const mockZadd = vi.fn()
const mockPexpire = vi.fn()
const mockDel = vi.fn()
const mockOn = vi.fn()

const mockPipelineInstance = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  pexpire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([
    [null, 0], // zremrangebyscore result
    [null, 0], // zcard result
  ]),
}

const mockPipeline = vi.fn().mockReturnValue(mockPipelineInstance)

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(function () {
    return {
      zremrangebyscore: mockZremrangebyscore,
      zcard: mockZcard,
      zadd: mockZadd,
      pexpire: mockPexpire,
      del: mockDel,
      on: mockOn,
      pipeline: mockPipeline,
    }
  })

  return {
    Redis: MockRedis,
    default: MockRedis,
  }
})

describe('@molecule/api-rate-limit-redis', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }

    // Reset pipeline mock to default (empty window)
    mockPipelineInstance.exec.mockResolvedValue([
      [null, 0], // zremrangebyscore
      [null, 0], // zcard — 0 entries in window
    ])
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('createProvider()', () => {
    it('should create a provider with default config', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const provider = createProvider()

      expect(provider).toBeDefined()
      expect(Redis).toHaveBeenCalled()
    })

    it('should create provider with REDIS_URL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      vi.resetModules()

      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      createProvider()

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', { keyPrefix: 'rl:' })
    })

    it('should create provider with custom options', async () => {
      vi.resetModules()

      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      createProvider({
        host: 'custom-host',
        port: 6380,
        password: 'secret',
        db: 1,
        keyPrefix: 'custom:',
      })

      expect(Redis).toHaveBeenCalledWith({
        host: 'custom-host',
        port: 6380,
        password: 'secret',
        db: 1,
        keyPrefix: 'custom:',
      })
    })

    it('should use environment variables as defaults', async () => {
      process.env.REDIS_HOST = 'env-host'
      process.env.REDIS_PORT = '6381'
      process.env.REDIS_PASSWORD = 'env-secret'
      vi.resetModules()

      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      createProvider()

      expect(Redis).toHaveBeenCalledWith({
        host: 'env-host',
        port: 6381,
        password: 'env-secret',
        db: 0,
        keyPrefix: 'rl:',
      })
    })
  })

  describe('interface conformance', () => {
    it('conforms to the RateLimitProvider interface', async () => {
      const { createProvider } = await import('../provider.js')
      const p: RateLimitProvider = createProvider()

      expect(typeof p.check).toBe('function')
      expect(typeof p.consume).toBe('function')
      expect(typeof p.reset).toBe('function')
      expect(typeof p.getRemaining).toBe('function')
      expect(typeof p.configure).toBe('function')
    })
  })

  describe('check()', () => {
    it('returns allowed=true when under the limit', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 0 entries in window
      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 0],
      ])

      const result = await provider.check('test-key')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
      expect(result.total).toBe(10)
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.retryAfter).toBeUndefined()
    })

    it('returns allowed=false when at the limit', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 10 entries in window (at limit)
      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 10],
      ])

      const result = await provider.check('test-key')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('does not add entries to Redis', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 3],
      ])

      await provider.check('test-key')

      // Only one pipeline call (for count), no zadd calls
      expect(mockPipeline).toHaveBeenCalledTimes(1)
      expect(mockPipelineInstance.zadd).not.toHaveBeenCalled()
    })
  })

  describe('consume()', () => {
    it('adds entries and returns allowed=true when under limit', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // Count pipeline: 0 entries
      mockPipelineInstance.exec
        .mockResolvedValueOnce([
          [null, 0],
          [null, 0],
        ])
        // Add pipeline
        .mockResolvedValueOnce([])

      const result = await provider.consume('test-key')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.total).toBe(10)
    })

    it('rejects when consuming would exceed the limit', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 10 entries already in window
      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 10],
      ])

      const result = await provider.consume('test-key')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('supports custom cost', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 0 entries in window
      mockPipelineInstance.exec
        .mockResolvedValueOnce([
          [null, 0],
          [null, 0],
        ])
        .mockResolvedValueOnce([])

      const result = await provider.consume('test-key', 5)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('rejects when cost exceeds remaining', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 8 entries already
      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 8],
      ])

      const result = await provider.consume('test-key', 5)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(2)
    })

    it('sets pexpire on the sorted set key', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec
        .mockResolvedValueOnce([
          [null, 0],
          [null, 0],
        ])
        .mockResolvedValueOnce([])

      await provider.consume('test-key')

      expect(mockPipelineInstance.pexpire).toHaveBeenCalledWith('test-key', 60_000)
    })
  })

  describe('reset()', () => {
    it('deletes the sorted set key', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()

      await provider.reset('test-key')

      expect(mockDel).toHaveBeenCalledWith('test-key')
    })
  })

  describe('getRemaining()', () => {
    it('returns max for a fresh key', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 0],
      ])

      const remaining = await provider.getRemaining('test-key')

      expect(remaining).toBe(10)
    })

    it('returns correct count after consumption', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      // 3 entries in window
      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 3],
      ])

      const remaining = await provider.getRemaining('test-key')

      expect(remaining).toBe(7)
    })

    it('returns 0 when fully consumed', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 10],
      ])

      const remaining = await provider.getRemaining('test-key')

      expect(remaining).toBe(0)
    })
  })

  describe('configure()', () => {
    it('updates window and max settings', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 30_000, max: 5 })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 0],
      ])

      const result = await provider.check('test-key')

      expect(result.total).toBe(5)
      expect(result.remaining).toBe(5)
    })

    it('applies keyPrefix to operations', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10, keyPrefix: 'api' })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [null, 0],
      ])

      await provider.check('test-key')

      // Should have called pipeline with prefixed key
      expect(mockPipelineInstance.zremrangebyscore).toHaveBeenCalledWith(
        'api:test-key',
        0,
        expect.any(Number),
      )
    })
  })

  describe('error handling', () => {
    it('returns 0 count when pipeline returns null results', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec.mockResolvedValueOnce(null)

      const result = await provider.check('test-key')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
    })

    it('returns 0 count when pipeline returns error', async () => {
      const { createProvider } = await import('../provider.js')
      const provider = createProvider()
      provider.configure({ windowMs: 60_000, max: 10 })

      mockPipelineInstance.exec.mockResolvedValueOnce([
        [null, 0],
        [new Error('Redis error'), null],
      ])

      const result = await provider.check('test-key')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
    })
  })

  describe('provider (default export)', () => {
    it('exports a default provider instance via Proxy', async () => {
      const { provider } = await import('../provider.js')

      expect(provider).toBeDefined()
      expect(typeof provider.check).toBe('function')
      expect(typeof provider.consume).toBe('function')
      expect(typeof provider.reset).toBe('function')
      expect(typeof provider.getRemaining).toBe('function')
      expect(typeof provider.configure).toBe('function')
    })
  })
})
