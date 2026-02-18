import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCapabilities,
  getDimensions,
  getOrientation,
  getState,
  isLocked,
  lock,
  lockCurrent,
  lockLandscape,
  lockPortrait,
  onChange,
  unlock,
} from '../orientation.js'
import { setProvider } from '../provider.js'
import type { OrientationLock, OrientationType, ScreenOrientationProvider } from '../types.js'

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

describe('Orientation Functions', () => {
  let mockProvider: ScreenOrientationProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('getOrientation', () => {
    it('should return current orientation', async () => {
      const orientation = await getOrientation()
      expect(orientation).toBe('portrait-primary')
      expect(mockProvider.getOrientation).toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('should return current orientation state', async () => {
      const state = await getState()
      expect(state.type).toBe('portrait-primary')
      expect(state.angle).toBe(0)
      expect(state.isLocked).toBe(false)
      expect(mockProvider.getState).toHaveBeenCalled()
    })
  })

  describe('getDimensions', () => {
    it('should return screen dimensions', async () => {
      const dimensions = await getDimensions()
      expect(dimensions.width).toBe(375)
      expect(dimensions.height).toBe(812)
      expect(dimensions.pixelRatio).toBe(3)
      expect(dimensions.isPortrait).toBe(true)
      expect(dimensions.isLandscape).toBe(false)
      expect(mockProvider.getDimensions).toHaveBeenCalled()
    })
  })

  describe('lock', () => {
    it('should lock orientation', async () => {
      await lock('portrait')
      expect(mockProvider.lock).toHaveBeenCalledWith('portrait')
    })

    it('should lock to specific orientation type', async () => {
      await lock('landscape-primary')
      expect(mockProvider.lock).toHaveBeenCalledWith('landscape-primary')
    })
  })

  describe('unlock', () => {
    it('should unlock orientation', async () => {
      await unlock()
      expect(mockProvider.unlock).toHaveBeenCalled()
    })
  })

  describe('isLocked', () => {
    it('should return lock state', async () => {
      const locked = await isLocked()
      expect(locked).toBe(false)
      expect(mockProvider.isLocked).toHaveBeenCalled()
    })
  })

  describe('onChange', () => {
    it('should register orientation change callback', () => {
      const callback = vi.fn()
      const unsubscribe = onChange(callback)
      expect(mockProvider.onChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('getCapabilities', () => {
    it('should return orientation capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.canLock).toBe(true)
      expect(capabilities.canDetectChanges).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })

  describe('lockPortrait', () => {
    it('should lock to portrait', async () => {
      await lockPortrait()
      expect(mockProvider.lock).toHaveBeenCalledWith('portrait')
    })
  })

  describe('lockLandscape', () => {
    it('should lock to landscape', async () => {
      await lockLandscape()
      expect(mockProvider.lock).toHaveBeenCalledWith('landscape')
    })
  })

  describe('lockCurrent', () => {
    it('should lock to portrait when current is portrait', async () => {
      mockProvider = createMockProvider({
        getOrientation: vi.fn().mockResolvedValue('portrait-primary'),
      })
      setProvider(mockProvider)

      await lockCurrent()
      expect(mockProvider.lock).toHaveBeenCalledWith('portrait')
    })

    it('should lock to landscape when current is landscape', async () => {
      mockProvider = createMockProvider({
        getOrientation: vi.fn().mockResolvedValue('landscape-primary'),
      })
      setProvider(mockProvider)

      await lockCurrent()
      expect(mockProvider.lock).toHaveBeenCalledWith('landscape')
    })
  })
})
