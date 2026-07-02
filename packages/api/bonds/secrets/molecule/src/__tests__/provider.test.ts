import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { createMoleculeSecretsProvider as CreateMoleculeSecretsProviderFn } from '../provider.js'

let createMoleculeSecretsProvider: typeof CreateMoleculeSecretsProviderFn

// Mock fetch globally
const mockFetch = vi.fn()

const DEFAULT_VAULT_URL = 'https://api.molecule.dev/v1/vault'

describe('@molecule/api-secrets-molecule', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', mockFetch)
    // Per workspace note: resetAllMocks (not clearAllMocks) drains
    // mockResolvedValueOnce queues so leftover Once values can't leak.
    vi.resetAllMocks()

    const providerModule = await import('../provider.js')
    createMoleculeSecretsProvider = providerModule.createMoleculeSecretsProvider

    // Clean up any test env vars
    delete process.env.__TEST_MOLECULE_KEY__
    delete process.env.MOLECULE_VAULT_TOKEN
    delete process.env.MOLECULE_APP_ID
    delete process.env.MOLECULE_VAULT_URL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.__TEST_MOLECULE_KEY__
    delete process.env.MOLECULE_VAULT_TOKEN
    delete process.env.MOLECULE_APP_ID
    delete process.env.MOLECULE_VAULT_URL
  })

  describe('createMoleculeSecretsProvider', () => {
    it('should create a provider with name "molecule"', () => {
      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      expect(provider.name).toBe('molecule')
    })

    it('should create a provider with all required methods', () => {
      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('get', () => {
    it('should fetch secrets from the vault and return requested key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'secret-value', OTHER: 'other' }),
      })

      const provider = createMoleculeSecretsProvider({
        token: 'mol.test_token',
        appId: 'app_123',
      })
      const result = await provider.get('API_KEY')

      expect(result).toBe('secret-value')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify the URL, auth header, and per-app scoping header.
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain(`${DEFAULT_VAULT_URL}/secrets`)
      expect(options.headers.Authorization).toBe('Bearer mol.test_token')
      expect(options.headers['X-Molecule-App-Id']).toBe('app_123')
    })

    it('should return undefined for missing key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OTHER_KEY: 'value' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      const result = await provider.get('MISSING_KEY')

      expect(result).toBeUndefined()
    })

    it('should use MOLECULE_* env vars when no options provided', async () => {
      process.env.MOLECULE_VAULT_TOKEN = 'mol.env_token'
      process.env.MOLECULE_APP_ID = 'app_env'
      process.env.MOLECULE_VAULT_URL = 'https://vault.example.test/v1'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'value' }),
      })

      // Re-import to pick up the env vars (token/appId/url are read at create).
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createMoleculeSecretsProvider()
      await provider.get('KEY')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('https://vault.example.test/v1/secrets')
      expect(options.headers.Authorization).toBe('Bearer mol.env_token')
      expect(options.headers['X-Molecule-App-Id']).toBe('app_env')
    })

    it('should cache secrets and reuse cache within TTL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'cached-value' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test', cacheTtl: 60000 })

      // First call should fetch.
      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache.
      const result = await provider.get('KEY')
      expect(result).toBe('cached-value')
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1 call
    })

    it('should refetch after TTL expires', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'old-value' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test', cacheTtl: 1000 })

      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance past TTL.
      vi.advanceTimersByTime(1001)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'new-value' }),
      })

      const result = await provider.get('KEY')
      expect(result).toBe('new-value')
      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should fall back to process.env when no token is configured', async () => {
      process.env.__TEST_MOLECULE_KEY__ = 'no-token-fallback'

      // Re-import without MOLECULE_VAULT_TOKEN in env.
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createMoleculeSecretsProvider({})

      const result = await provider.get('__TEST_MOLECULE_KEY__')
      expect(result).toBe('no-token-fallback')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getMany', () => {
    it('should return requested keys from the vault and pass them via ?keys=', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            KEY_A: 'val-a',
            KEY_B: 'val-b',
            KEY_C: 'val-c',
          }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      const result = await provider.getMany(['KEY_A', 'KEY_C'])

      expect(result).toEqual({
        KEY_A: 'val-a',
        KEY_C: 'val-c',
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('keys=KEY_A%2CKEY_C')
    })

    it('should return undefined for missing keys', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY_A: 'val-a' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      const result = await provider.getMany(['KEY_A', 'MISSING'])

      expect(result.KEY_A).toBe('val-a')
      expect(result.MISSING).toBeUndefined()
    })

    it('should fall back to process.env on fetch failure with no cache', async () => {
      process.env.__TEST_MOLECULE_KEY__ = 'env-fallback'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      const result = await provider.getMany(['__TEST_MOLECULE_KEY__', 'MISSING'])

      expect(result.__TEST_MOLECULE_KEY__).toBe('env-fallback')
      expect(result.MISSING).toBeUndefined()
    })
  })

  describe('stale-while-error', () => {
    it('should serve last-good cache on fetch failure (default staleWhileError)', async () => {
      vi.useFakeTimers()

      // Prime the cache with a good fetch.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'good-value' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test', cacheTtl: 1000 })
      expect(await provider.get('KEY')).toBe('good-value')

      // Expire the cache, then fail the refetch.
      vi.advanceTimersByTime(1001)
      mockFetch.mockRejectedValueOnce(new Error('Vault down'))

      // Should serve the stale cached value, NOT process.env.
      const result = await provider.get('KEY')
      expect(result).toBe('good-value')
      expect(mockFetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should fall back to process.env only when cache is empty', async () => {
      process.env.__TEST_MOLECULE_KEY__ = 'env-only-value'
      mockFetch.mockRejectedValueOnce(new Error('Vault down'))

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      const result = await provider.get('__TEST_MOLECULE_KEY__')

      expect(result).toBe('env-only-value')
    })

    it('should NOT serve stale cache when staleWhileError is false', async () => {
      vi.useFakeTimers()

      process.env.KEY = 'env-fallback'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'good-value' }),
      })

      const provider = createMoleculeSecretsProvider({
        token: 'mol.test',
        cacheTtl: 1000,
        staleWhileError: false,
      })
      expect(await provider.get('KEY')).toBe('good-value')

      vi.advanceTimersByTime(1001)
      mockFetch.mockRejectedValueOnce(new Error('Vault down'))

      // With staleWhileError off, a failed refetch falls straight to process.env.
      const result = await provider.get('KEY')
      expect(result).toBe('env-fallback')

      vi.useRealTimers()
      delete process.env.KEY
    })
  })

  describe('set', () => {
    it('should PUT secret to the vault at /secrets/:key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test', appId: 'app_123' })
      await provider.set!('NEW_KEY', 'new-value')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`${DEFAULT_VAULT_URL}/secrets/NEW_KEY`)
      expect(options.method).toBe('PUT')
      expect(options.headers.Authorization).toBe('Bearer mol.test')
      expect(options.headers['X-Molecule-App-Id']).toBe('app_123')

      const body = JSON.parse(options.body)
      expect(body).toEqual({ value: 'new-value' })
    })

    it('should throw when the vault returns an error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      await expect(provider.set!('KEY', 'value')).rejects.toThrow('Molecule vault error: 400')
    })

    it('should throw when no token is configured', async () => {
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createMoleculeSecretsProvider({})

      await expect(provider.set!('KEY', 'value')).rejects.toThrow(
        'Molecule vault token not configured',
      )
    })

    it('should invalidate cache after set', async () => {
      // First, populate the cache.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'old-value' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Now set a value (invalidates cache).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await provider.set!('KEY', 'new-value')

      // Next get should fetch again (cache invalidated).
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'new-value' }),
      })
      const result = await provider.get('KEY')
      expect(result).toBe('new-value')
      expect(mockFetch).toHaveBeenCalledTimes(3) // initial fetch + set + re-fetch
    })
  })

  describe('delete', () => {
    it('should DELETE the key at /secrets/:key and invalidate cache', async () => {
      // Populate cache first.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ TO_DELETE: 'value' }),
      })
      const provider = createMoleculeSecretsProvider({ token: 'mol.test', appId: 'app_123' })
      await provider.get('TO_DELETE')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Delete.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await provider.delete!('TO_DELETE')

      const [url, options] = mockFetch.mock.calls[1]
      expect(url).toBe(`${DEFAULT_VAULT_URL}/secrets/TO_DELETE`)
      expect(options.method).toBe('DELETE')
      expect(options.headers.Authorization).toBe('Bearer mol.test')
      expect(options.headers['X-Molecule-App-Id']).toBe('app_123')

      // Cache invalidated → next get refetches.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await provider.get('TO_DELETE')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw when no token is configured', async () => {
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createMoleculeSecretsProvider({})

      await expect(provider.delete!('KEY')).rejects.toThrow('Molecule vault token not configured')
    })
  })

  describe('isAvailable', () => {
    it('should return false when no token is configured', async () => {
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createMoleculeSecretsProvider({})

      expect(await provider.isAvailable()).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return true when the vault call succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      expect(await provider.isAvailable()).toBe(true)
    })

    it('should return false when the vault call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      expect(await provider.isAvailable()).toBe(false)
    })

    it('should return false when the vault returns non-200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      expect(await provider.isAvailable()).toBe(false)
    })
  })

  describe('syncToEnv', () => {
    it('should sync only requested keys present in the response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            __TEST_MOLECULE_KEY__: 'synced-value',
            OTHER: 'other-value',
          }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      await provider.syncToEnv!(['__TEST_MOLECULE_KEY__'])

      expect(process.env.__TEST_MOLECULE_KEY__).toBe('synced-value')
      // Should not sync keys not in the requested list.
      expect(process.env.OTHER).toBeUndefined()
    })

    it('should skip undefined values during sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY_A: 'value-a' }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      await provider.syncToEnv!(['KEY_A', 'MISSING_KEY'])

      expect(process.env.KEY_A).toBe('value-a')
      expect(process.env.MISSING_KEY).toBeUndefined()

      delete process.env.KEY_A
    })

    it('should warn but not throw when fetch fails with no cache', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Sync failed'))

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })

      // Should not throw.
      await provider.syncToEnv!(['KEY'])

      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })

    // Broker seam: a `*_BASE_URL` gateway pointer must be synced verbatim so
    // brokering stays a pure vault-value decision (no provider rewriting).
    it('should sync a *_BASE_URL gateway pointer to env verbatim (broker seam)', async () => {
      const brokerUrl = 'https://api.molecule.dev/v1/ai'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ANTHROPIC_BASE_URL: brokerUrl,
            ANTHROPIC_API_KEY: 'broker-scoped-token',
          }),
      })

      const provider = createMoleculeSecretsProvider({ token: 'mol.test' })
      await provider.syncToEnv!(['ANTHROPIC_BASE_URL', 'ANTHROPIC_API_KEY'])

      expect(process.env.ANTHROPIC_BASE_URL).toBe(brokerUrl)
      expect(process.env.ANTHROPIC_API_KEY).toBe('broker-scoped-token')

      delete process.env.ANTHROPIC_BASE_URL
      delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      const { provider } = await import('../provider.js')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('molecule')
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('index exports', () => {
    it('should export createMoleculeSecretsProvider and provider', async () => {
      const indexModule = await import('../index.js')
      expect(indexModule.createMoleculeSecretsProvider).toBeDefined()
      expect(indexModule.provider).toBeDefined()
    })

    it('should not re-export from @molecule/api-secrets', async () => {
      const indexModule = (await import('../index.js')) as Record<string, unknown>
      // Core interface should be imported from @molecule/api-secrets directly.
      expect(indexModule.setProvider).toBeUndefined()
      expect(indexModule.getProvider).toBeUndefined()
      expect(indexModule.hasProvider).toBeUndefined()
    })

    it('registers its secret definitions at import time', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('MOLECULE_VAULT_TOKEN')).toBeDefined()
    })
  })
})
