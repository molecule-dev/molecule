import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { FeatureFlag, FeatureFlagProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let isEnabled: typeof ProviderModule.isEnabled
let getFlag: typeof ProviderModule.getFlag
let setFlag: typeof ProviderModule.setFlag
let getAllFlags: typeof ProviderModule.getAllFlags
let deleteFlag: typeof ProviderModule.deleteFlag
let evaluateForUser: typeof ProviderModule.evaluateForUser

const mockFlag: FeatureFlag = {
  name: 'dark-mode',
  enabled: true,
  description: 'Enable dark mode',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const makeMockProvider = (overrides?: Partial<FeatureFlagProvider>): FeatureFlagProvider => ({
  isEnabled: vi.fn().mockResolvedValue(true),
  getFlag: vi.fn().mockResolvedValue(mockFlag),
  setFlag: vi.fn().mockResolvedValue(mockFlag),
  getAllFlags: vi.fn().mockResolvedValue([mockFlag]),
  deleteFlag: vi.fn().mockResolvedValue(undefined),
  evaluateForUser: vi.fn().mockResolvedValue({ 'dark-mode': true }),
  ...overrides,
})

describe('feature flags provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    isEnabled = providerModule.isEnabled
    getFlag = providerModule.getFlag
    setFlag = providerModule.setFlag
    getAllFlags = providerModule.getAllFlags
    deleteFlag = providerModule.deleteFlag
    evaluateForUser = providerModule.evaluateForUser
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Feature flag provider not configured. Call setProvider() first.',
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

  describe('isEnabled', () => {
    it('should throw when no provider is set', async () => {
      await expect(isEnabled('dark-mode')).rejects.toThrow('Feature flag provider not configured')
    })

    it('should delegate to provider isEnabled', async () => {
      const mockFn = vi.fn().mockResolvedValue(true)
      setProvider(makeMockProvider({ isEnabled: mockFn }))

      const result = await isEnabled('dark-mode')

      expect(mockFn).toHaveBeenCalledWith('dark-mode', undefined)
      expect(result).toBe(true)
    })

    it('should pass context when provided', async () => {
      const mockFn = vi.fn().mockResolvedValue(false)
      setProvider(makeMockProvider({ isEnabled: mockFn }))

      const context = { userId: 'user-1', attributes: { plan: 'pro' } }
      await isEnabled('dark-mode', context)

      expect(mockFn).toHaveBeenCalledWith('dark-mode', context)
    })
  })

  describe('getFlag', () => {
    it('should throw when no provider is set', async () => {
      await expect(getFlag('dark-mode')).rejects.toThrow('Feature flag provider not configured')
    })

    it('should delegate to provider getFlag', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockFlag)
      setProvider(makeMockProvider({ getFlag: mockFn }))

      const result = await getFlag('dark-mode')

      expect(mockFn).toHaveBeenCalledWith('dark-mode')
      expect(result).toBe(mockFlag)
    })

    it('should return null for non-existent flags', async () => {
      const mockFn = vi.fn().mockResolvedValue(null)
      setProvider(makeMockProvider({ getFlag: mockFn }))

      const result = await getFlag('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('setFlag', () => {
    it('should throw when no provider is set', async () => {
      await expect(setFlag({ name: 'test', enabled: true })).rejects.toThrow(
        'Feature flag provider not configured',
      )
    })

    it('should delegate to provider setFlag', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockFlag)
      setProvider(makeMockProvider({ setFlag: mockFn }))

      const flagUpdate = { name: 'dark-mode', enabled: true, description: 'Enable dark mode' }
      const result = await setFlag(flagUpdate)

      expect(mockFn).toHaveBeenCalledWith(flagUpdate)
      expect(result).toBe(mockFlag)
    })
  })

  describe('getAllFlags', () => {
    it('should throw when no provider is set', async () => {
      await expect(getAllFlags()).rejects.toThrow('Feature flag provider not configured')
    })

    it('should delegate to provider getAllFlags', async () => {
      const mockFn = vi.fn().mockResolvedValue([mockFlag])
      setProvider(makeMockProvider({ getAllFlags: mockFn }))

      const result = await getAllFlags()

      expect(mockFn).toHaveBeenCalled()
      expect(result).toEqual([mockFlag])
    })

    it('should return empty array when no flags exist', async () => {
      const mockFn = vi.fn().mockResolvedValue([])
      setProvider(makeMockProvider({ getAllFlags: mockFn }))

      const result = await getAllFlags()

      expect(result).toEqual([])
    })
  })

  describe('deleteFlag', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteFlag('dark-mode')).rejects.toThrow('Feature flag provider not configured')
    })

    it('should delegate to provider deleteFlag', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ deleteFlag: mockFn }))

      await deleteFlag('dark-mode')

      expect(mockFn).toHaveBeenCalledWith('dark-mode')
    })
  })

  describe('evaluateForUser', () => {
    it('should throw when no provider is set', async () => {
      await expect(evaluateForUser('user-1')).rejects.toThrow(
        'Feature flag provider not configured',
      )
    })

    it('should delegate to provider evaluateForUser', async () => {
      const mockFn = vi.fn().mockResolvedValue({ 'dark-mode': true })
      setProvider(makeMockProvider({ evaluateForUser: mockFn }))

      const result = await evaluateForUser('user-1')

      expect(mockFn).toHaveBeenCalledWith('user-1', undefined)
      expect(result).toEqual({ 'dark-mode': true })
    })

    it('should pass flag names when provided', async () => {
      const mockFn = vi.fn().mockResolvedValue({ 'dark-mode': true })
      setProvider(makeMockProvider({ evaluateForUser: mockFn }))

      await evaluateForUser('user-1', ['dark-mode', 'beta-features'])

      expect(mockFn).toHaveBeenCalledWith('user-1', ['dark-mode', 'beta-features'])
    })
  })
})
