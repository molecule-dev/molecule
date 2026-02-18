import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { BrightnessProvider } from '../types.js'
import {
  clamp,
  createBrightnessController,
  fromPercentage,
  toPercentage,
  withBrightness,
} from '../utilities.js'

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

describe('Utility Functions', () => {
  describe('toPercentage', () => {
    it('should convert brightness to percentage', () => {
      expect(toPercentage(0)).toBe(0)
      expect(toPercentage(0.5)).toBe(50)
      expect(toPercentage(1)).toBe(100)
    })

    it('should round to nearest integer', () => {
      expect(toPercentage(0.333)).toBe(33)
      expect(toPercentage(0.666)).toBe(67)
      expect(toPercentage(0.999)).toBe(100)
    })
  })

  describe('fromPercentage', () => {
    it('should convert percentage to brightness', () => {
      expect(fromPercentage(0)).toBe(0)
      expect(fromPercentage(50)).toBe(0.5)
      expect(fromPercentage(100)).toBe(1)
    })

    it('should handle decimal percentages', () => {
      expect(fromPercentage(33)).toBe(0.33)
      expect(fromPercentage(67)).toBe(0.67)
    })
  })

  describe('clamp', () => {
    it('should return value if within range', () => {
      expect(clamp(0.5)).toBe(0.5)
      expect(clamp(0)).toBe(0)
      expect(clamp(1)).toBe(1)
    })

    it('should clamp values below 0', () => {
      expect(clamp(-0.1)).toBe(0)
      expect(clamp(-1)).toBe(0)
    })

    it('should clamp values above 1', () => {
      expect(clamp(1.1)).toBe(1)
      expect(clamp(2)).toBe(1)
    })
  })

  describe('withBrightness', () => {
    let mockProvider: BrightnessProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should set brightness before callback and restore after', async () => {
      const callback = vi.fn().mockResolvedValue('result')

      const result = await withBrightness(0.8, callback)

      expect(mockProvider.getBrightness).toHaveBeenCalled()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.8, undefined)
      expect(callback).toHaveBeenCalled()
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.5, undefined)
      expect(result).toBe('result')
    })

    it('should restore brightness even if callback throws', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('test error'))

      await expect(withBrightness(0.8, callback)).rejects.toThrow('test error')
      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.5, undefined)
    })

    it('should work with synchronous callbacks', async () => {
      const callback = vi.fn().mockReturnValue('sync result')

      const result = await withBrightness(0.8, callback)

      expect(result).toBe('sync result')
    })
  })

  describe('createBrightnessController', () => {
    let mockProvider: BrightnessProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should create a controller object', () => {
      const controller = createBrightnessController()
      expect(controller).toHaveProperty('animateTo')
      expect(controller).toHaveProperty('stop')
      expect(controller).toHaveProperty('isAnimating')
    })

    it('should report not animating initially', () => {
      const controller = createBrightnessController()
      expect(controller.isAnimating()).toBe(false)
    })

    it('should stop animation', () => {
      const controller = createBrightnessController()
      controller.stop()
      expect(controller.isAnimating()).toBe(false)
    })

    it('should fall back to setBrightness when requestAnimationFrame is unavailable', async () => {
      const originalRAF = globalThis.requestAnimationFrame
      // @ts-expect-error - intentionally removing for test
      delete globalThis.requestAnimationFrame

      const controller = createBrightnessController()
      await controller.animateTo(0.8)

      expect(mockProvider.setBrightness).toHaveBeenCalledWith(0.8, undefined)

      globalThis.requestAnimationFrame = originalRAF
    })
  })
})
