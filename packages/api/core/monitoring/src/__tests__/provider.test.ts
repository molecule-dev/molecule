import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { MonitoringProvider, SystemHealth } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider
let runAll: typeof ProviderModule.runAll
let getLatest: typeof ProviderModule.getLatest

describe('monitoring provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../provider.js')
    setProvider = mod.setProvider
    getProvider = mod.getProvider
    hasProvider = mod.hasProvider
    getOptionalProvider = mod.getOptionalProvider
    runAll = mod.runAll
    getLatest = mod.getLatest
  })

  const createMockHealth = (): SystemHealth => ({
    status: 'operational',
    checks: {
      database: {
        name: 'database',
        category: 'infrastructure',
        status: 'operational',
        checkedAt: new Date().toISOString(),
      },
    },
    timestamp: new Date().toISOString(),
  })

  const createMockProvider = (overrides?: Partial<MonitoringProvider>): MonitoringProvider => ({
    register: vi.fn(),
    deregister: vi.fn().mockReturnValue(true),
    runAll: vi.fn().mockResolvedValue(createMockHealth()),
    getLatest: vi.fn().mockReturnValue(null),
    getRegisteredChecks: vi.fn().mockReturnValue([]),
    ...overrides,
  })

  describe('setProvider', () => {
    it('should bond the monitoring provider without throwing', () => {
      const mockProvider = createMockProvider()
      expect(() => setProvider(mockProvider)).not.toThrow()
    })

    it('should make the provider retrievable via getProvider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should throw with i18n message when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(
        'Monitoring provider not configured. Call setProvider() first.',
      )
    })

    it('should return the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      const result = getProvider()
      expect(result).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should return true when a provider is bonded', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('getOptionalProvider', () => {
    it('should return null when no provider is bonded', () => {
      expect(getOptionalProvider()).toBeNull()
    })

    it('should return the provider when bonded', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getOptionalProvider()).toBe(mockProvider)
    })
  })

  describe('runAll', () => {
    it('should throw when no provider is bonded', () => {
      expect(() => runAll()).toThrow(
        'Monitoring provider not configured. Call setProvider() first.',
      )
    })

    it('should delegate to the bonded provider', async () => {
      const expectedHealth = createMockHealth()
      const mockRunAll = vi.fn().mockResolvedValue(expectedHealth)
      const mockProvider = createMockProvider({ runAll: mockRunAll })
      setProvider(mockProvider)

      const result = await runAll()

      expect(mockRunAll).toHaveBeenCalledOnce()
      expect(result).toBe(expectedHealth)
    })
  })

  describe('getLatest', () => {
    it('should throw when no provider is bonded', () => {
      expect(() => getLatest()).toThrow(
        'Monitoring provider not configured. Call setProvider() first.',
      )
    })

    it('should return null when runAll has not been called yet', () => {
      const mockProvider = createMockProvider({ getLatest: vi.fn().mockReturnValue(null) })
      setProvider(mockProvider)
      expect(getLatest()).toBeNull()
    })

    it('should delegate to the bonded provider and return the latest health', () => {
      const expectedHealth = createMockHealth()
      const mockGetLatest = vi.fn().mockReturnValue(expectedHealth)
      const mockProvider = createMockProvider({ getLatest: mockGetLatest })
      setProvider(mockProvider)

      const result = getLatest()

      expect(mockGetLatest).toHaveBeenCalledOnce()
      expect(result).toBe(expectedHealth)
    })
  })
})
