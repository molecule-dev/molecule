import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock ioredis before importing
vi.mock('ioredis', () => {
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  const mockSetex = vi.fn()
  const mockDel = vi.fn()
  const mockExists = vi.fn()
  const mockMget = vi.fn()
  const mockSadd = vi.fn()
  const mockSmembers = vi.fn()
  const mockFlushdb = vi.fn()
  const mockQuit = vi.fn()
  const mockOn = vi.fn()
  const mockPipeline = vi.fn()

  const mockPipelineInstance = {
    set: vi.fn().mockReturnThis(),
    setex: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }

  const mockRedis = vi.fn(function () {
    return {
      get: mockGet,
      set: mockSet,
      setex: mockSetex,
      del: mockDel,
      exists: mockExists,
      mget: mockMget,
      sadd: mockSadd,
      smembers: mockSmembers,
      flushdb: mockFlushdb,
      quit: mockQuit,
      on: mockOn,
      pipeline: mockPipeline.mockReturnValue(mockPipelineInstance),
    }
  })

  return {
    Redis: mockRedis,
    default: mockRedis,
  }
})

describe('@molecule/api-cache-redis', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
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

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379', { keyPrefix: 'molecule:' })
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
        keyPrefix: 'molecule:',
      })
    })

    it('should set up event handlers', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      createProvider()

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function))
    })
  })

  describe('provider.get()', () => {
    it('should return undefined for missing key', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.get).mockResolvedValueOnce(null)

      const provider = createProvider()
      const result = await provider.get('missing-key')

      expect(result).toBeUndefined()
    })

    it('should return parsed JSON value', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.get).mockResolvedValueOnce(JSON.stringify({ name: 'test' }))

      const provider = createProvider()
      const result = await provider.get('key')

      expect(result).toEqual({ name: 'test' })
    })

    it('should return raw value if JSON parsing fails', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.get).mockResolvedValueOnce('plain string')

      const provider = createProvider()
      const result = await provider.get('key')

      expect(result).toBe('plain string')
    })
  })

  describe('provider.set()', () => {
    it('should set value without TTL', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.set('key', { name: 'test' })

      expect(mockClient.set).toHaveBeenCalledWith('key', JSON.stringify({ name: 'test' }))
    })

    it('should set value with TTL', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.set('key', 'value', { ttl: 60 })

      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, '"value"')
    })

    it('should track tags', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.set('key', 'value', { tags: ['tag1', 'tag2'] })

      expect(mockClient.sadd).toHaveBeenCalledWith('_tag:tag1', 'key')
      expect(mockClient.sadd).toHaveBeenCalledWith('_tag:tag2', 'key')
    })
  })

  describe('provider.delete()', () => {
    it('should return true when key is deleted', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.del).mockResolvedValueOnce(1)

      const provider = createProvider()
      const result = await provider.delete('key')

      expect(result).toBe(true)
    })

    it('should return false when key does not exist', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.del).mockResolvedValueOnce(0)

      const provider = createProvider()
      const result = await provider.delete('missing-key')

      expect(result).toBe(false)
    })
  })

  describe('provider.has()', () => {
    it('should return true when key exists', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.exists).mockResolvedValueOnce(1)

      const provider = createProvider()
      const result = await provider.has('key')

      expect(result).toBe(true)
    })

    it('should return false when key does not exist', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.exists).mockResolvedValueOnce(0)

      const provider = createProvider()
      const result = await provider.has('missing-key')

      expect(result).toBe(false)
    })
  })

  describe('provider.getMany()', () => {
    it('should return empty map for empty keys array', async () => {
      const { createProvider } = await import('../provider.js')

      const provider = createProvider()
      const result = await provider.getMany([])

      expect(result).toEqual(new Map())
    })

    it('should return map of key-value pairs', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.mget).mockResolvedValueOnce([
        JSON.stringify({ a: 1 }),
        null,
        JSON.stringify({ c: 3 }),
      ])

      const provider = createProvider()
      const result = await provider.getMany(['key1', 'key2', 'key3'])

      expect(result.get('key1')).toEqual({ a: 1 })
      expect(result.has('key2')).toBe(false)
      expect(result.get('key3')).toEqual({ c: 3 })
    })

    it('should handle non-JSON values', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.mget).mockResolvedValueOnce(['plain string'])

      const provider = createProvider()
      const result = await provider.getMany(['key1'])

      expect(result.get('key1')).toBe('plain string')
    })
  })

  describe('provider.setMany()', () => {
    it('should do nothing for empty entries array', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.setMany([])

      expect(mockClient.pipeline).not.toHaveBeenCalled()
    })

    it('should set multiple values using pipeline', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      const mockPipeline = mockClient.pipeline()

      const provider = createProvider()
      await provider.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ])

      expect(mockPipeline.set).toHaveBeenCalledTimes(2)
      expect(mockPipeline.exec).toHaveBeenCalled()
    })

    it('should use setex when TTL is provided', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      const mockPipeline = mockClient.pipeline()

      const provider = createProvider()
      await provider.setMany([['key1', 'value1']], { ttl: 60 })

      expect(mockPipeline.setex).toHaveBeenCalledWith('key1', 60, '"value1"')
    })

    it('should track tags in pipeline', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      const mockPipeline = mockClient.pipeline()

      const provider = createProvider()
      await provider.setMany([['key1', 'value1']], { tags: ['tag1'] })

      expect(mockPipeline.sadd).toHaveBeenCalledWith('_tag:tag1', 'key1')
    })
  })

  describe('provider.deleteMany()', () => {
    it('should return 0 for empty keys array', async () => {
      const { createProvider } = await import('../provider.js')

      const provider = createProvider()
      const result = await provider.deleteMany([])

      expect(result).toBe(0)
    })

    it('should delete multiple keys', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.del).mockResolvedValueOnce(2)

      const provider = createProvider()
      const result = await provider.deleteMany(['key1', 'key2'])

      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2')
      expect(result).toBe(2)
    })
  })

  describe('provider.invalidateTag()', () => {
    it('should delete all keys with the tag', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.smembers).mockResolvedValueOnce(['key1', 'key2'])

      const provider = createProvider()
      await provider.invalidateTag('tag1')

      expect(mockClient.smembers).toHaveBeenCalledWith('_tag:tag1')
      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2')
      expect(mockClient.del).toHaveBeenCalledWith('_tag:tag1')
    })

    it('should only delete tag key when no keys have the tag', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.smembers).mockResolvedValueOnce([])

      const provider = createProvider()
      await provider.invalidateTag('empty-tag')

      expect(mockClient.del).toHaveBeenCalledWith('_tag:empty-tag')
      expect(mockClient.del).toHaveBeenCalledTimes(1)
    })
  })

  describe('provider.clear()', () => {
    it('should flush the database', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.clear()

      expect(mockClient.flushdb).toHaveBeenCalled()
    })
  })

  describe('provider.close()', () => {
    it('should quit the Redis connection', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()

      const provider = createProvider()
      await provider.close()

      expect(mockClient.quit).toHaveBeenCalled()
    })
  })

  describe('provider.getOrSet()', () => {
    it('should return cached value if exists', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.get).mockResolvedValueOnce(JSON.stringify({ cached: true }))

      const factory = vi.fn().mockResolvedValue({ fresh: true })

      const provider = createProvider()
      const result = await provider.getOrSet('key', factory)

      expect(result).toEqual({ cached: true })
      expect(factory).not.toHaveBeenCalled()
    })

    it('should call factory and cache result if not cached', async () => {
      const { Redis } = await import('ioredis')
      const { createProvider } = await import('../provider.js')

      const mockClient = new (Redis as unknown as new (
        ...args: unknown[]
      ) => Record<string, Mock>)()
      vi.mocked(mockClient.get).mockResolvedValueOnce(null)

      const factory = vi.fn().mockResolvedValue({ fresh: true })

      const provider = createProvider()
      const result = await provider.getOrSet('key', factory, { ttl: 60 })

      expect(result).toEqual({ fresh: true })
      expect(factory).toHaveBeenCalled()
      expect(mockClient.setex).toHaveBeenCalledWith('key', 60, JSON.stringify({ fresh: true }))
    })
  })

  describe('createClient()', () => {
    it('should create a raw Redis client', async () => {
      const { Redis } = await import('ioredis')
      const { createClient } = await import('../provider.js')

      const client = createClient()

      expect(client).toBeDefined()
      expect(Redis).toHaveBeenCalled()
    })

    it('should create client with REDIS_URL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      vi.resetModules()

      const { Redis } = await import('ioredis')
      const { createClient } = await import('../provider.js')

      createClient()

      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379')
    })

    it('should create client with custom options', async () => {
      vi.resetModules()

      const { Redis } = await import('ioredis')
      const { createClient } = await import('../provider.js')

      createClient({
        host: 'custom-host',
        port: 6380,
        password: 'secret',
        db: 2,
      })

      expect(Redis).toHaveBeenCalledWith({
        host: 'custom-host',
        port: 6380,
        password: 'secret',
        db: 2,
      })
    })
  })

  describe('provider (default export)', () => {
    it('should export a default provider instance', async () => {
      const { provider } = await import('../provider.js')

      expect(provider).toBeDefined()
      expect(provider.get).toBeDefined()
      expect(provider.set).toBeDefined()
      expect(provider.delete).toBeDefined()
      expect(provider.has).toBeDefined()
    })
  })
})
