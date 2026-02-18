import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  decrease,
  getBrightness,
  getCapabilities,
  getState,
  increase,
  isAutoBrightness,
  isKeepScreenOn,
  reset,
  setAutoBrightness,
  setBrightness,
  setHalf,
  setKeepScreenOn,
  setMax,
  setMin,
} from '../brightness.js'
import { setProvider } from '../provider.js'
import type { BrightnessOptions, BrightnessProvider } from '../types.js'

const createMockProvider = (overrides?: Partial<BrightnessProvider>): BrightnessProvider => ({
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
  ...overrides,
})

describe('Brightness Functions', () => {
  let mockProvider: BrightnessProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getBrightness', () => {
    it('should return current brightness', async () => {
      const brightness = await getBrightness()
      expect(brightness).toBe(0.5)
      expect(mockProvider.getBrightness).toHaveBeenCalled()
    })
  })

  describe('setBrightness', () => {
    it('should set brightness value', async () => {
      await setBrightness(0.75)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.75, undefined)
    })

    it('should set brightness with options', async () => {
      const options: BrightnessOptions = { persist: true, animate: true }
      await setBrightness(0.75, options)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.75, options)
    })
  })

  describe('getState', () => {
    it('should return brightness state', async () => {
      const state = await getState()
      expect(state.brightness).toBe(0.5)
      expect(state.isAuto).toBe(false)
      expect(state.keepScreenOn).toBe(false)
      expect(mockProvider.getState).toHaveBeenCalled()
    })
  })

  describe('isAutoBrightness', () => {
    it('should return auto brightness state', async () => {
      const isAuto = await isAutoBrightness()
      expect(isAuto).toBe(false)
      expect(mockProvider.isAutoBrightness).toHaveBeenCalled()
    })
  })

  describe('setAutoBrightness', () => {
    it('should enable auto brightness', async () => {
      await setAutoBrightness(true)
      expect(mockProvider.setAutoBrightness).toHaveBeenCalledWith(true)
    })

    it('should disable auto brightness', async () => {
      await setAutoBrightness(false)
      expect(mockProvider.setAutoBrightness).toHaveBeenCalledWith(false)
    })
  })

  describe('setKeepScreenOn', () => {
    it('should enable keep screen on', async () => {
      await setKeepScreenOn(true)
      expect(mockProvider.setKeepScreenOn).toHaveBeenCalledWith(true)
    })

    it('should disable keep screen on', async () => {
      await setKeepScreenOn(false)
      expect(mockProvider.setKeepScreenOn).toHaveBeenCalledWith(false)
    })
  })

  describe('isKeepScreenOn', () => {
    it('should return keep screen on state', async () => {
      const keepOn = await isKeepScreenOn()
      expect(keepOn).toBe(false)
      expect(mockProvider.isKeepScreenOn).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should reset brightness to system default', async () => {
      await reset()
      expect(mockProvider.reset).toHaveBeenCalled()
    })
  })

  describe('getCapabilities', () => {
    it('should return brightness capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.canControlAuto).toBe(true)
      expect(capabilities.canKeepScreenOn).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })

  describe('setMax', () => {
    it('should set brightness to 1', async () => {
      await setMax()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(1, undefined)
    })
  })

  describe('setMin', () => {
    it('should set brightness to 0', async () => {
      await setMin()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0, undefined)
    })
  })

  describe('setHalf', () => {
    it('should set brightness to 0.5', async () => {
      await setHalf()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.5, undefined)
    })
  })

  describe('increase', () => {
    it('should increase brightness by default amount', async () => {
      await increase()
      expect(mockProvider.getBrightness).toHaveBeenCalled()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.6, undefined)
    })

    it('should increase brightness by custom amount', async () => {
      await increase(0.2)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.7, undefined)
    })

    it('should not exceed 1', async () => {
      mockProvider = createMockProvider({
        getBrightness: vi.fn().mockResolvedValue(0.95),
      })
      setProvider(mockProvider)

      await increase(0.1)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(1, undefined)
    })
  })

  describe('decrease', () => {
    it('should decrease brightness by default amount', async () => {
      await decrease()
      expect(mockProvider.getBrightness).toHaveBeenCalled()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.4, undefined)
    })

    it('should decrease brightness by custom amount', async () => {
      await decrease(0.2)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.3, undefined)
    })

    it('should not go below 0', async () => {
      mockProvider = createMockProvider({
        getBrightness: vi.fn().mockResolvedValue(0.05),
      })
      setProvider(mockProvider)

      await decrease(0.1)
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0, undefined)
    })
  })
})
