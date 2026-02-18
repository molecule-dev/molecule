import { describe, expect, it, vi } from 'vitest'

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
  })

  describe('hasProvider', () => {
    it('should return true when a provider is set', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })
})
