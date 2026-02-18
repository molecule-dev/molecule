import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { OrientationLock, OrientationType, ScreenOrientationProvider } from '../types.js'
import {
  angleFromOrientation,
  isLandscape,
  isPortrait,
  orientationFromAngle,
  orientationMatchesLock,
  withOrientation,
} from '../utilities.js'

const createMockProvider = (
  overrides?: Partial<ScreenOrientationProvider>,
): ScreenOrientationProvider => ({
  getOrientation: vi.fn().mockResolvedValue('portrait-primary' as OrientationType),
  getState: vi.fn().mockResolvedValue({
    type: 'portrait-primary' as OrientationType,
    angle: 0,
    isLocked: false,
  }),
  getDimensions: vi.fn().mockResolvedValue({
    width: 375,
    height: 812,
    pixelRatio: 3,
    isLandscape: false,
    isPortrait: true,
  }),
  lock: vi.fn().mockResolvedValue(undefined),
  unlock: vi.fn().mockResolvedValue(undefined),
  isLocked: vi.fn().mockResolvedValue(false),
  onChange: vi.fn().mockReturnValue(() => {}),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    canLock: true,
    supportedLockTypes: ['portrait', 'landscape', 'any'] as OrientationLock[],
    canDetectChanges: true,
  }),
  ...overrides,
})

describe('Utility Functions', () => {
  describe('isPortrait', () => {
    it('should return true for portrait-primary', () => {
      expect(isPortrait('portrait-primary')).toBe(true)
    })

    it('should return true for portrait-secondary', () => {
      expect(isPortrait('portrait-secondary')).toBe(true)
    })

    it('should return true for portrait', () => {
      expect(isPortrait('portrait')).toBe(true)
    })

    it('should return false for landscape orientations', () => {
      expect(isPortrait('landscape')).toBe(false)
      expect(isPortrait('landscape-primary')).toBe(false)
      expect(isPortrait('landscape-secondary')).toBe(false)
    })
  })

  describe('isLandscape', () => {
    it('should return true for landscape-primary', () => {
      expect(isLandscape('landscape-primary')).toBe(true)
    })

    it('should return true for landscape-secondary', () => {
      expect(isLandscape('landscape-secondary')).toBe(true)
    })

    it('should return true for landscape', () => {
      expect(isLandscape('landscape')).toBe(true)
    })

    it('should return false for portrait orientations', () => {
      expect(isLandscape('portrait')).toBe(false)
      expect(isLandscape('portrait-primary')).toBe(false)
      expect(isLandscape('portrait-secondary')).toBe(false)
    })
  })

  describe('orientationFromAngle', () => {
    describe('with natural portrait device', () => {
      it('should return portrait-primary for 0 degrees', () => {
        expect(orientationFromAngle(0, true)).toBe('portrait-primary')
      })

      it('should return landscape-primary for 90 degrees', () => {
        expect(orientationFromAngle(90, true)).toBe('landscape-primary')
      })

      it('should return portrait-secondary for 180 degrees', () => {
        expect(orientationFromAngle(180, true)).toBe('portrait-secondary')
      })

      it('should return landscape-secondary for 270 degrees', () => {
        expect(orientationFromAngle(270, true)).toBe('landscape-secondary')
      })

      it('should handle negative angles', () => {
        expect(orientationFromAngle(-90, true)).toBe('landscape-secondary')
      })

      it('should handle angles greater than 360', () => {
        expect(orientationFromAngle(450, true)).toBe('landscape-primary')
      })
    })

    describe('with natural landscape device', () => {
      it('should return landscape-primary for 0 degrees', () => {
        expect(orientationFromAngle(0, false)).toBe('landscape-primary')
      })

      it('should return portrait-primary for 90 degrees', () => {
        expect(orientationFromAngle(90, false)).toBe('portrait-primary')
      })

      it('should return landscape-secondary for 180 degrees', () => {
        expect(orientationFromAngle(180, false)).toBe('landscape-secondary')
      })

      it('should return portrait-secondary for 270 degrees', () => {
        expect(orientationFromAngle(270, false)).toBe('portrait-secondary')
      })
    })

    it('should default to natural portrait', () => {
      expect(orientationFromAngle(0)).toBe('portrait-primary')
    })
  })

  describe('angleFromOrientation', () => {
    describe('with natural portrait device', () => {
      it('should return 0 for portrait-primary', () => {
        expect(angleFromOrientation('portrait-primary', true)).toBe(0)
      })

      it('should return 0 for portrait', () => {
        expect(angleFromOrientation('portrait', true)).toBe(0)
      })

      it('should return 90 for landscape-primary', () => {
        expect(angleFromOrientation('landscape-primary', true)).toBe(90)
      })

      it('should return 90 for landscape', () => {
        expect(angleFromOrientation('landscape', true)).toBe(90)
      })

      it('should return 180 for portrait-secondary', () => {
        expect(angleFromOrientation('portrait-secondary', true)).toBe(180)
      })

      it('should return 270 for landscape-secondary', () => {
        expect(angleFromOrientation('landscape-secondary', true)).toBe(270)
      })
    })

    describe('with natural landscape device', () => {
      it('should return 0 for landscape-primary', () => {
        expect(angleFromOrientation('landscape-primary', false)).toBe(0)
      })

      it('should return 90 for portrait-primary', () => {
        expect(angleFromOrientation('portrait-primary', false)).toBe(90)
      })

      it('should return 180 for landscape-secondary', () => {
        expect(angleFromOrientation('landscape-secondary', false)).toBe(180)
      })

      it('should return 270 for portrait-secondary', () => {
        expect(angleFromOrientation('portrait-secondary', false)).toBe(270)
      })
    })

    it('should default to natural portrait', () => {
      expect(angleFromOrientation('portrait-primary')).toBe(0)
    })
  })

  describe('withOrientation', () => {
    let mockProvider: ScreenOrientationProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should lock orientation before callback and restore after', async () => {
      const callback = vi.fn().mockResolvedValue('result')

      const result = await withOrientation('landscape', callback)

      expect(mockProvider.isLocked).toHaveBeenCalled()
      expect(mockProvider.getState).toHaveBeenCalled()
      expect(mockProvider.lock).toHaveBeenCalledWith('landscape')
      expect(callback).toHaveBeenCalled()
      expect(mockProvider.unlock).toHaveBeenCalled()
      expect(result).toBe('result')
    })

    it('should restore previous lock state if was locked', async () => {
      mockProvider = createMockProvider({
        isLocked: vi.fn().mockResolvedValue(true),
        getState: vi.fn().mockResolvedValue({
          type: 'portrait-primary' as OrientationType,
          angle: 0,
          isLocked: true,
          lockType: 'portrait' as OrientationLock,
        }),
      })
      setProvider(mockProvider)

      const callback = vi.fn().mockResolvedValue('result')

      await withOrientation('landscape', callback)

      expect(mockProvider.lock).toHaveBeenCalledWith('landscape')
      expect(mockProvider.lock).toHaveBeenCalledWith('portrait')
    })

    it('should handle errors in callback and still restore', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('test error'))

      await expect(withOrientation('landscape', callback)).rejects.toThrow('test error')
      expect(mockProvider.unlock).toHaveBeenCalled()
    })
  })

  describe('orientationMatchesLock', () => {
    it('should return true for any lock type', () => {
      expect(orientationMatchesLock('portrait-primary', 'any')).toBe(true)
      expect(orientationMatchesLock('landscape-secondary', 'any')).toBe(true)
    })

    it('should return true for natural lock type', () => {
      expect(orientationMatchesLock('portrait-primary', 'natural')).toBe(true)
      expect(orientationMatchesLock('landscape-secondary', 'natural')).toBe(true)
    })

    it('should return true for portrait lock with portrait orientations', () => {
      expect(orientationMatchesLock('portrait-primary', 'portrait')).toBe(true)
      expect(orientationMatchesLock('portrait-secondary', 'portrait')).toBe(true)
      expect(orientationMatchesLock('portrait', 'portrait')).toBe(true)
    })

    it('should return false for portrait lock with landscape orientations', () => {
      expect(orientationMatchesLock('landscape-primary', 'portrait')).toBe(false)
      expect(orientationMatchesLock('landscape-secondary', 'portrait')).toBe(false)
    })

    it('should return true for landscape lock with landscape orientations', () => {
      expect(orientationMatchesLock('landscape-primary', 'landscape')).toBe(true)
      expect(orientationMatchesLock('landscape-secondary', 'landscape')).toBe(true)
      expect(orientationMatchesLock('landscape', 'landscape')).toBe(true)
    })

    it('should return false for landscape lock with portrait orientations', () => {
      expect(orientationMatchesLock('portrait-primary', 'landscape')).toBe(false)
      expect(orientationMatchesLock('portrait-secondary', 'landscape')).toBe(false)
    })

    it('should return true for exact match', () => {
      expect(orientationMatchesLock('portrait-primary', 'portrait-primary')).toBe(true)
      expect(orientationMatchesLock('landscape-secondary', 'landscape-secondary')).toBe(true)
    })

    it('should return false for non-matching specific lock', () => {
      expect(orientationMatchesLock('portrait-primary', 'portrait-secondary')).toBe(false)
      expect(orientationMatchesLock('landscape-primary', 'landscape-secondary')).toBe(false)
    })
  })
})
