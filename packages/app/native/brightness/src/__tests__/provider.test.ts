import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, reset } from '@molecule/app-bond'

import { getProvider, hasProvider, setProvider } from '../provider.js'
import type { BrightnessProvider } from '../types.js'

const createMockProvider = (): BrightnessProvider => ({
  getBrightness: vi.fn().mockResolvedValue(0.5),
  setBrightness: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockResolvedValue({
    brightness: 0.5,
    isAuto: false,
    keepScreenOn: false,
  }),
  isAutoBrightness: vi.fn().mockResolvedValue(false),
  setAutoBrightness: vi.fn().mockResolvedValue(undefined),
  setKeepScreenOn: vi.fn().mockResolvedValue(undefined),
  isKeepScreenOn: vi.fn().mockResolvedValue(false),
  reset: vi.fn().mockResolvedValue(undefined),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    canControlAuto: true,
    canKeepScreenOn: true,
    canReadSystemBrightness: true,
    minBrightness: 0,
    maxBrightness: 1,
  }),
})

// Reset the shared @molecule/app-bond registry before every test so a provider
// bonded in one test cannot leak into the next.
beforeEach(() => {
  reset()
})

describe('Provider Management', () => {
  describe('setProvider', () => {
    it('should set a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should throw when no provider is bonded', () => {
      expect(() => getProvider()).toThrow(/No provider set/)
    })
  })

  describe('hasProvider', () => {
    it('should return true when a provider is set', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('should return false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })
  })

  describe('app-bond registry integration', () => {
    it('exposes a provider bonded via bond("brightness", p) through getProvider()/hasProvider()', () => {
      // The exact bug: a provider written to the SHARED @molecule/app-bond
      // registry must be visible through this core's own accessors.
      const mockProvider = createMockProvider()
      bond('brightness', mockProvider)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })
  })
})
