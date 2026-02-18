import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { createDopplerProvider as CreateDopplerProviderFn } from '../provider.js'

let createDopplerProvider: typeof CreateDopplerProviderFn

// Mock fetch globally
const mockFetch = vi.fn()

describe('@molecule/api-secrets-doppler', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()

    const providerModule = await import('../provider.js')
    createDopplerProvider = providerModule.createDopplerProvider

    // Clean up any test env vars
    delete process.env.__TEST_DOPPLER_KEY__
    delete process.env.DOPPLER_TOKEN
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.__TEST_DOPPLER_KEY__
    delete process.env.DOPPLER_TOKEN
  })

  describe('createDopplerProvider', () => {
    it('should create a provider with name "doppler"', () => {
      const provider = createDopplerProvider({ token: 'dp.st.test' })
      expect(provider.name).toBe('doppler')
    })

    it('should create a provider with all required methods', () => {
      const provider = createDopplerProvider({ token: 'dp.st.test' })
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('get', () => {
    it('should fetch secrets from Doppler API and return requested key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ API_KEY: 'secret-value', OTHER: 'other' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test_token' })
      const result = await provider.get('API_KEY')

      expect(result).toBe('secret-value')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify the URL and auth header
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('https://api.doppler.com/v3/configs/config/secrets/download')
      expect(url).toContain('format=json')
      expect(options.headers.Authorization).toBe('Bearer dp.st.test_token')
    })

    it('should return undefined for missing key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OTHER_KEY: 'value' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.get('MISSING_KEY')

      expect(result).toBeUndefined()
    })

    it('should fall back to process.env when Doppler API fails', async () => {
      process.env.__TEST_DOPPLER_KEY__ = 'fallback-value'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.get('__TEST_DOPPLER_KEY__')

      expect(result).toBe('fallback-value')
    })

    it('should fall back to process.env on non-200 response', async () => {
      process.env.__TEST_DOPPLER_KEY__ = 'env-fallback'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.get('__TEST_DOPPLER_KEY__')

      expect(result).toBe('env-fallback')
    })

    it('should use DOPPLER_TOKEN from env when no token option provided', async () => {
      process.env.DOPPLER_TOKEN = 'dp.st.env_token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'value' }),
      })

      // Re-import to pick up the env var
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createDopplerProvider()
      await provider.get('KEY')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers.Authorization).toBe('Bearer dp.st.env_token')
    })

    it('should include project and config params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'value' }),
      })

      const provider = createDopplerProvider({
        token: 'dp.st.test',
        project: 'my-project',
        config: 'production',
      })
      await provider.get('KEY')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('project=my-project')
      expect(url).toContain('config=production')
    })

    it('should cache secrets and reuse cache within TTL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'cached-value' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test', cacheTtl: 60000 })

      // First call should fetch
      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await provider.get('KEY')
      expect(result).toBe('cached-value')
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still 1 call
    })

    it('should refresh cache after TTL expires', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'old-value' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test', cacheTtl: 1000 })

      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance past TTL
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
      process.env.__TEST_DOPPLER_KEY__ = 'no-token-fallback'

      // Re-import without DOPPLER_TOKEN in env
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createDopplerProvider({})

      const result = await provider.get('__TEST_DOPPLER_KEY__')
      expect(result).toBe('no-token-fallback')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getMany', () => {
    it('should return requested keys from Doppler', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            KEY_A: 'val-a',
            KEY_B: 'val-b',
            KEY_C: 'val-c',
          }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.getMany(['KEY_A', 'KEY_C'])

      expect(result).toEqual({
        KEY_A: 'val-a',
        KEY_C: 'val-c',
      })
    })

    it('should return undefined for missing keys', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY_A: 'val-a' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.getMany(['KEY_A', 'MISSING'])

      expect(result.KEY_A).toBe('val-a')
      expect(result.MISSING).toBeUndefined()
    })

    it('should fall back to process.env on API failure', async () => {
      process.env.__TEST_DOPPLER_KEY__ = 'env-fallback'
      mockFetch.mockRejectedValueOnce(new Error('API error'))

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      const result = await provider.getMany(['__TEST_DOPPLER_KEY__', 'MISSING'])

      expect(result.__TEST_DOPPLER_KEY__).toBe('env-fallback')
      expect(result.MISSING).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should POST secret to Doppler API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await provider.set!('NEW_KEY', 'new-value')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('https://api.doppler.com/v3/configs/config/secrets')
      expect(options.method).toBe('POST')
      expect(options.headers.Authorization).toBe('Bearer dp.st.test')

      const body = JSON.parse(options.body)
      expect(body.secrets).toEqual({ NEW_KEY: 'new-value' })
    })

    it('should include project and config in body when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createDopplerProvider({
        token: 'dp.st.test',
        project: 'my-proj',
        config: 'dev',
      })
      await provider.set!('KEY', 'value')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.project).toBe('my-proj')
      expect(body.config).toBe('dev')
    })

    it('should throw when Doppler API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await expect(provider.set!('KEY', 'value')).rejects.toThrow('Doppler API error: 400')
    })

    it('should throw when no token is configured', async () => {
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createDopplerProvider({})

      await expect(provider.set!('KEY', 'value')).rejects.toThrow('Doppler token not configured')
    })

    it('should invalidate cache after set', async () => {
      // First, populate the cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY: 'old-value' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await provider.get('KEY')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Now set a value (invalidates cache)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await provider.set!('KEY', 'new-value')

      // Next get should fetch again (cache invalidated)
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
    it('should set key to empty string via set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await provider.delete!('TO_DELETE')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.secrets).toEqual({ TO_DELETE: '' })
    })
  })

  describe('isAvailable', () => {
    it('should return false when no token is configured', async () => {
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createDopplerProvider({})

      expect(await provider.isAvailable()).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return true when API call succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      expect(await provider.isAvailable()).toBe(true)
    })

    it('should return false when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      expect(await provider.isAvailable()).toBe(false)
    })

    it('should return false when API returns non-200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      expect(await provider.isAvailable()).toBe(false)
    })
  })

  describe('syncToEnv', () => {
    it('should sync secrets to process.env', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            __TEST_DOPPLER_KEY__: 'synced-value',
            OTHER: 'other-value',
          }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await provider.syncToEnv!(['__TEST_DOPPLER_KEY__'])

      expect(process.env.__TEST_DOPPLER_KEY__).toBe('synced-value')
      // Should not sync keys not in the list
      expect(process.env.OTHER).toBeUndefined()
    })

    it('should skip undefined values during sync', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ KEY_A: 'value-a' }),
      })

      const provider = createDopplerProvider({ token: 'dp.st.test' })
      await provider.syncToEnv!(['KEY_A', 'MISSING_KEY'])

      expect(process.env.KEY_A).toBe('value-a')
      expect(process.env.MISSING_KEY).toBeUndefined()

      delete process.env.KEY_A
    })

    it('should warn but not throw when fetch fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Sync failed'))

      const provider = createDopplerProvider({ token: 'dp.st.test' })

      // Should not throw
      await provider.syncToEnv!(['KEY'])

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to sync secrets from Doppler:',
        expect.any(Error),
      )

      warnSpy.mockRestore()
    })

    it('should warn when no token is available', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      const mod = await import('../provider.js')
      const provider = mod.createDopplerProvider({})

      // Should not throw, but should warn
      await provider.syncToEnv!(['KEY'])

      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', async () => {
      const { provider } = await import('../provider.js')
      expect(provider).toBeDefined()
      expect(provider.name).toBe('doppler')
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getMany).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.isAvailable).toBe('function')
      expect(typeof provider.syncToEnv).toBe('function')
    })
  })

  describe('index exports', () => {
    it('should export createDopplerProvider and provider', async () => {
      const indexModule = await import('../index.js')
      expect(indexModule.createDopplerProvider).toBeDefined()
      expect(indexModule.provider).toBeDefined()
    })

    it('should not re-export from @molecule/api-secrets', async () => {
      const indexModule = (await import('../index.js')) as Record<string, unknown>
      // Core interface should be imported from @molecule/api-secrets directly, not from bonds
      expect(indexModule.setProvider).toBeUndefined()
      expect(indexModule.getProvider).toBeUndefined()
      expect(indexModule.hasProvider).toBeUndefined()
    })
  })
})
