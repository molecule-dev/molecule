import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { SecretDefinition, SecretsProvider } from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let get: typeof ProviderModule.get
let getMany: typeof ProviderModule.getMany
let getRequired: typeof ProviderModule.getRequired
let validate: typeof ProviderModule.validate
let isConfigured: typeof ProviderModule.isConfigured
let syncToEnv: typeof ProviderModule.syncToEnv

describe('secrets provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    get = providerModule.get
    getMany = providerModule.getMany
    getRequired = providerModule.getRequired
    validate = providerModule.validate
    isConfigured = providerModule.isConfigured
    syncToEnv = providerModule.syncToEnv
  })

  describe('provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })

    it('should allow replacing the provider', () => {
      const provider1: SecretsProvider = {
        name: 'provider1',
        get: vi.fn(),
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      const provider2: SecretsProvider = {
        name: 'provider2',
        get: vi.fn(),
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(provider1)
      expect(getProvider()).toBe(provider1)

      setProvider(provider2)
      expect(getProvider()).toBe(provider2)
    })
  })

  describe('get', () => {
    it('should fall back to process.env when no provider is set', async () => {
      process.env.__TEST_SECRET_GET__ = 'env-value'
      try {
        const result = await get('__TEST_SECRET_GET__')
        expect(result).toBe('env-value')
      } finally {
        delete process.env.__TEST_SECRET_GET__
      }
    })

    it('should return undefined from process.env for missing keys when no provider', async () => {
      const result = await get('__NONEXISTENT_KEY_12345__')
      expect(result).toBeUndefined()
    })

    it('should call provider get when provider is set', async () => {
      const mockGet = vi.fn(() => Promise.resolve('provider-value'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await get('MY_SECRET')
      expect(mockGet).toHaveBeenCalledWith('MY_SECRET')
      expect(result).toBe('provider-value')
    })

    it('should return undefined from provider for missing keys', async () => {
      const mockGet = vi.fn(() => Promise.resolve(undefined))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await get('MISSING_KEY')
      expect(result).toBeUndefined()
    })
  })

  describe('getMany', () => {
    it('should fall back to process.env when no provider is set', async () => {
      process.env.__TEST_KEY_A__ = 'value-a'
      process.env.__TEST_KEY_B__ = 'value-b'
      try {
        const result = await getMany(['__TEST_KEY_A__', '__TEST_KEY_B__', '__MISSING_KEY__'])
        expect(result).toEqual({
          __TEST_KEY_A__: 'value-a',
          __TEST_KEY_B__: 'value-b',
          __MISSING_KEY__: undefined,
        })
      } finally {
        delete process.env.__TEST_KEY_A__
        delete process.env.__TEST_KEY_B__
      }
    })

    it('should call provider getMany when provider is set', async () => {
      const mockGetMany = vi.fn(() =>
        Promise.resolve({
          KEY1: 'val1',
          KEY2: 'val2',
        }),
      )
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: mockGetMany,
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await getMany(['KEY1', 'KEY2'])
      expect(mockGetMany).toHaveBeenCalledWith(['KEY1', 'KEY2'])
      expect(result).toEqual({ KEY1: 'val1', KEY2: 'val2' })
    })

    it('should return empty object for empty keys array without provider', async () => {
      const result = await getMany([])
      expect(result).toEqual({})
    })
  })

  describe('getRequired', () => {
    it('should return value when secret exists', async () => {
      const mockGet = vi.fn(() => Promise.resolve('secret-value'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const result = await getRequired('MY_SECRET')
      expect(result).toBe('secret-value')
    })

    it('should throw when secret is not set', async () => {
      const mockGet = vi.fn(() => Promise.resolve(undefined))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      await expect(getRequired('MISSING_SECRET')).rejects.toThrow(
        "Required secret 'MISSING_SECRET' is not set",
      )
    })

    it('should throw when secret is empty string', async () => {
      const mockGet = vi.fn(() => Promise.resolve(''))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      await expect(getRequired('EMPTY_SECRET')).rejects.toThrow(
        "Required secret 'EMPTY_SECRET' is not set",
      )
    })

    it('should fall back to process.env when no provider and value exists', async () => {
      process.env.__TEST_REQUIRED__ = 'env-value'
      try {
        const result = await getRequired('__TEST_REQUIRED__')
        expect(result).toBe('env-value')
      } finally {
        delete process.env.__TEST_REQUIRED__
      }
    })

    it('should throw when no provider and env var is missing', async () => {
      await expect(getRequired('__TOTALLY_MISSING_SECRET__')).rejects.toThrow(
        "Required secret '__TOTALLY_MISSING_SECRET__' is not set",
      )
    })

    it('should include configuration hint in error message', async () => {
      await expect(getRequired('MISSING')).rejects.toThrow('Check your environment configuration')
    })
  })

  describe('validate', () => {
    it('should validate required secrets that are present', async () => {
      const mockGet = vi.fn(() => Promise.resolve('some-value'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [{ key: 'API_KEY', description: 'An API key' }]

      const results = await validate(definitions)
      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('API_KEY')
      expect(results[0].valid).toBe(true)
      expect(results[0].value).toBe('***') // Value should be masked
    })

    it('should fail validation for required secrets that are missing', async () => {
      const mockGet = vi.fn(() => Promise.resolve(undefined))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [{ key: 'MISSING_KEY', description: 'A missing key' }]

      const results = await validate(definitions)
      expect(results).toHaveLength(1)
      expect(results[0].key).toBe('MISSING_KEY')
      expect(results[0].valid).toBe(false)
      expect(results[0].error).toContain("Required secret 'MISSING_KEY' is not set")
    })

    it('should pass validation for optional secrets that are missing', async () => {
      const mockGet = vi.fn(() => Promise.resolve(undefined))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        { key: 'OPTIONAL_KEY', description: 'An optional key', required: false },
      ]

      const results = await validate(definitions)
      expect(results).toHaveLength(1)
      expect(results[0].valid).toBe(true)
      expect(results[0].value).toBeUndefined()
    })

    it('should validate pattern when value is present', async () => {
      const mockGet = vi.fn(() => Promise.resolve('sk_test_abc123'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        {
          key: 'STRIPE_KEY',
          description: 'Stripe key',
          pattern: '^sk_(test|live)_',
        },
      ]

      const results = await validate(definitions)
      expect(results[0].valid).toBe(true)
    })

    it('should fail validation when value does not match pattern', async () => {
      const mockGet = vi.fn(() => Promise.resolve('bad-key-value'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        {
          key: 'STRIPE_KEY',
          description: 'Stripe key',
          pattern: '^sk_(test|live)_',
        },
      ]

      const results = await validate(definitions)
      expect(results[0].valid).toBe(false)
      expect(results[0].error).toContain('does not match expected pattern')
    })

    it('should not check pattern when value is missing', async () => {
      const mockGet = vi.fn(() => Promise.resolve(undefined))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        {
          key: 'OPTIONAL_WITH_PATTERN',
          description: 'Optional with pattern',
          required: false,
          pattern: '^sk_',
        },
      ]

      const results = await validate(definitions)
      expect(results[0].valid).toBe(true)
    })

    it('should validate multiple definitions', async () => {
      const values: Record<string, string | undefined> = {
        KEY_A: 'value-a',
        KEY_B: undefined,
        KEY_C: 'value-c',
      }
      const mockGet = vi.fn((key: string) => Promise.resolve(values[key]))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        { key: 'KEY_A', description: 'Key A' },
        { key: 'KEY_B', description: 'Key B' },
        { key: 'KEY_C', description: 'Key C', required: false },
      ]

      const results = await validate(definitions)
      expect(results).toHaveLength(3)
      expect(results[0].valid).toBe(true)
      expect(results[1].valid).toBe(false)
      expect(results[2].valid).toBe(true)
    })

    it('should handle empty definitions array', async () => {
      const results = await validate([])
      expect(results).toEqual([])
    })
  })

  describe('isConfigured', () => {
    it('should return true when all required secrets are present', async () => {
      const mockGet = vi.fn(() => Promise.resolve('value'))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        { key: 'KEY_A', description: 'Key A' },
        { key: 'KEY_B', description: 'Key B' },
      ]

      expect(await isConfigured(definitions)).toBe(true)
    })

    it('should return false when any required secret is missing', async () => {
      const values: Record<string, string | undefined> = {
        KEY_A: 'value',
        KEY_B: undefined,
      }
      const mockGet = vi.fn((key: string) => Promise.resolve(values[key]))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        { key: 'KEY_A', description: 'Key A' },
        { key: 'KEY_B', description: 'Key B' },
      ]

      expect(await isConfigured(definitions)).toBe(false)
    })

    it('should return true for empty definitions', async () => {
      expect(await isConfigured([])).toBe(true)
    })

    it('should return true when only optional secrets are missing', async () => {
      const values: Record<string, string | undefined> = {
        REQUIRED: 'value',
        OPTIONAL: undefined,
      }
      const mockGet = vi.fn((key: string) => Promise.resolve(values[key]))
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: mockGet,
        getMany: vi.fn(),
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      const definitions: SecretDefinition[] = [
        { key: 'REQUIRED', description: 'Required' },
        { key: 'OPTIONAL', description: 'Optional', required: false },
      ]

      expect(await isConfigured(definitions)).toBe(true)
    })
  })

  describe('syncToEnv', () => {
    it('should call provider syncToEnv when available', async () => {
      const mockSyncToEnv = vi.fn(() => Promise.resolve())
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: vi.fn(),
        isAvailable: vi.fn(),
        syncToEnv: mockSyncToEnv,
      }
      setProvider(mockProvider)

      await syncToEnv(['KEY_A', 'KEY_B'])
      expect(mockSyncToEnv).toHaveBeenCalledWith(['KEY_A', 'KEY_B'])
    })

    it('should fallback to getMany + process.env when syncToEnv not available', async () => {
      const mockGetMany = vi.fn(() =>
        Promise.resolve({
          __SYNC_TEST_A__: 'synced-value-a',
          __SYNC_TEST_B__: 'synced-value-b',
        }),
      )
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: mockGetMany,
        isAvailable: vi.fn(),
        // No syncToEnv method
      }
      setProvider(mockProvider)

      try {
        await syncToEnv(['__SYNC_TEST_A__', '__SYNC_TEST_B__'])
        expect(mockGetMany).toHaveBeenCalledWith(['__SYNC_TEST_A__', '__SYNC_TEST_B__'])
        expect(process.env.__SYNC_TEST_A__).toBe('synced-value-a')
        expect(process.env.__SYNC_TEST_B__).toBe('synced-value-b')
      } finally {
        delete process.env.__SYNC_TEST_A__
        delete process.env.__SYNC_TEST_B__
      }
    })

    it('should not set undefined values in process.env during fallback', async () => {
      const mockGetMany = vi.fn(() =>
        Promise.resolve({
          __SYNC_PRESENT__: 'value',
          __SYNC_MISSING__: undefined,
        }),
      )
      const mockProvider: SecretsProvider = {
        name: 'test',
        get: vi.fn(),
        getMany: mockGetMany,
        isAvailable: vi.fn(),
      }
      setProvider(mockProvider)

      try {
        await syncToEnv(['__SYNC_PRESENT__', '__SYNC_MISSING__'])
        expect(process.env.__SYNC_PRESENT__).toBe('value')
        expect(process.env.__SYNC_MISSING__).toBeUndefined()
      } finally {
        delete process.env.__SYNC_PRESENT__
      }
    })

    it('should do nothing when no provider is set', async () => {
      // Should not throw
      await syncToEnv(['KEY_A', 'KEY_B'])
    })
  })
})
