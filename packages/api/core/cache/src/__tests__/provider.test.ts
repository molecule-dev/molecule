import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { CacheOptions, CacheProvider } from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let get: typeof ProviderModule.get
let set: typeof ProviderModule.set
let del: typeof ProviderModule.del
let has: typeof ProviderModule.has
let getOrSet: typeof ProviderModule.getOrSet

describe('cache provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    get = providerModule.get
    set = providerModule.set
    del = providerModule.del
    has = providerModule.has
    getOrSet = providerModule.getOrSet
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Cache provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('get', () => {
    it('should throw when no provider is set', async () => {
      await expect(get('key')).rejects.toThrow('Cache provider not configured')
    })

    it('should call provider get', async () => {
      const mockGet = vi.fn().mockResolvedValue('cached-value')
      const mockProvider: CacheProvider = {
        get: mockGet,
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await get<string>('my-key')

      expect(mockGet).toHaveBeenCalledWith('my-key')
      expect(result).toBe('cached-value')
    })

    it('should return undefined for missing keys', async () => {
      const mockGet = vi.fn().mockResolvedValue(undefined)
      const mockProvider: CacheProvider = {
        get: mockGet,
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await get('missing-key')

      expect(result).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should throw when no provider is set', async () => {
      await expect(set('key', 'value')).rejects.toThrow('Cache provider not configured')
    })

    it('should call provider set', async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: mockSet,
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)

      await set('my-key', 'my-value')

      expect(mockSet).toHaveBeenCalledWith('my-key', 'my-value', undefined)
    })

    it('should pass options to provider set', async () => {
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: mockSet,
        delete: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)

      const options: CacheOptions = { ttl: 3600, tags: ['user', 'session'] }
      await set('my-key', { data: 'complex' }, options)

      expect(mockSet).toHaveBeenCalledWith('my-key', { data: 'complex' }, options)
    })
  })

  describe('del', () => {
    it('should throw when no provider is set', async () => {
      await expect(del('key')).rejects.toThrow('Cache provider not configured')
    })

    it('should call provider delete', async () => {
      const mockDelete = vi.fn().mockResolvedValue(true)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: mockDelete,
        has: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await del('my-key')

      expect(mockDelete).toHaveBeenCalledWith('my-key')
      expect(result).toBe(true)
    })

    it('should return false when key does not exist', async () => {
      const mockDelete = vi.fn().mockResolvedValue(false)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: mockDelete,
        has: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await del('nonexistent-key')

      expect(result).toBe(false)
    })
  })

  describe('has', () => {
    it('should throw when no provider is set', async () => {
      await expect(has('key')).rejects.toThrow('Cache provider not configured')
    })

    it('should call provider has', async () => {
      const mockHas = vi.fn().mockResolvedValue(true)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: mockHas,
      }
      setProvider(mockProvider)

      const result = await has('my-key')

      expect(mockHas).toHaveBeenCalledWith('my-key')
      expect(result).toBe(true)
    })

    it('should return false for missing keys', async () => {
      const mockHas = vi.fn().mockResolvedValue(false)
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: mockHas,
      }
      setProvider(mockProvider)

      const result = await has('missing-key')

      expect(result).toBe(false)
    })
  })

  describe('getOrSet', () => {
    it('should throw when no provider is set', async () => {
      await expect(getOrSet('key', async () => 'value')).rejects.toThrow(
        'Cache provider not configured',
      )
    })

    it('should use native getOrSet when available', async () => {
      const mockGetOrSet = vi.fn().mockResolvedValue('native-value')
      const mockProvider: CacheProvider = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        has: vi.fn(),
        getOrSet: mockGetOrSet,
      }
      setProvider(mockProvider)

      const factory = vi.fn().mockResolvedValue('factory-value')
      const result = await getOrSet('my-key', factory)

      expect(mockGetOrSet).toHaveBeenCalledWith('my-key', factory, undefined)
      expect(result).toBe('native-value')
      expect(factory).not.toHaveBeenCalled()
    })

    it('should fallback when getOrSet is not available and value is cached', async () => {
      const mockGet = vi.fn().mockResolvedValue('cached-value')
      const mockSet = vi.fn()
      const mockProvider: CacheProvider = {
        get: mockGet,
        set: mockSet,
        delete: vi.fn(),
        has: vi.fn(),
        // getOrSet not defined
      }
      setProvider(mockProvider)

      const factory = vi.fn().mockResolvedValue('factory-value')
      const result = await getOrSet('my-key', factory)

      expect(mockGet).toHaveBeenCalledWith('my-key')
      expect(factory).not.toHaveBeenCalled()
      expect(mockSet).not.toHaveBeenCalled()
      expect(result).toBe('cached-value')
    })

    it('should fallback when getOrSet is not available and value is not cached', async () => {
      const mockGet = vi.fn().mockResolvedValue(undefined)
      const mockSet = vi.fn().mockResolvedValue(undefined)
      const mockProvider: CacheProvider = {
        get: mockGet,
        set: mockSet,
        delete: vi.fn(),
        has: vi.fn(),
        // getOrSet not defined
      }
      setProvider(mockProvider)

      const factory = vi.fn().mockResolvedValue('factory-value')
      const options: CacheOptions = { ttl: 300 }
      const result = await getOrSet('my-key', factory, options)

      expect(mockGet).toHaveBeenCalledWith('my-key')
      expect(factory).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith('my-key', 'factory-value', options)
      expect(result).toBe('factory-value')
    })
  })
})

describe('cache types', () => {
  it('should export CacheOptions type', () => {
    const options: CacheOptions = {
      ttl: 3600,
      tags: ['user', 'session'],
    }
    expect(options.ttl).toBe(3600)
  })

  it('should export CacheProvider type with required methods', () => {
    const provider: CacheProvider = {
      get: async <T>(_key: string): Promise<T | undefined> => undefined,
      set: async <T>(_key: string, _value: T, _options?: CacheOptions): Promise<void> => {},
      delete: async (_key: string): Promise<boolean> => true,
      has: async (_key: string): Promise<boolean> => false,
    }
    expect(typeof provider.get).toBe('function')
    expect(typeof provider.set).toBe('function')
    expect(typeof provider.delete).toBe('function')
    expect(typeof provider.has).toBe('function')
  })

  it('should export CacheProvider type with optional methods', () => {
    const provider: CacheProvider = {
      get: async <T>(): Promise<T | undefined> => undefined,
      set: async (): Promise<void> => {},
      delete: async (): Promise<boolean> => true,
      has: async (): Promise<boolean> => false,
      getMany: async <T>(_keys: string[]): Promise<Map<string, T>> => new Map(),
      setMany: async <T>(_entries: Array<[string, T]>): Promise<void> => {},
      deleteMany: async (_keys: string[]): Promise<number> => 0,
      invalidateTag: async (_tag: string): Promise<void> => {},
      clear: async (): Promise<void> => {},
      close: async (): Promise<void> => {},
      getOrSet: async <T>(_key: string, factory: () => Promise<T>): Promise<T> => factory(),
    }
    expect(typeof provider.getMany).toBe('function')
    expect(typeof provider.setMany).toBe('function')
    expect(typeof provider.deleteMany).toBe('function')
    expect(typeof provider.invalidateTag).toBe('function')
    expect(typeof provider.clear).toBe('function')
    expect(typeof provider.close).toBe('function')
    expect(typeof provider.getOrSet).toBe('function')
  })
})
