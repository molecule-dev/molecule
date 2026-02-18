import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAccelerometer,
  getCapabilities,
  getGyroscope,
  getOrientation,
  getPermissionStatus,
  getProvider,
  hasProvider,
  requestPermission,
  setProvider,
  startAccelerometer,
  startGyroscope,
  startMagnetometer,
  startMotion,
  startOrientation,
} from '../provider.js'
import type { MotionProvider } from '../types.js'

const createMockProvider = (overrides?: Partial<MotionProvider>): MotionProvider => ({
  startAccelerometer: vi.fn().mockReturnValue(() => {}),
  startGyroscope: vi.fn().mockReturnValue(() => {}),
  startMagnetometer: vi.fn().mockReturnValue(() => {}),
  startOrientation: vi.fn().mockReturnValue(() => {}),
  startMotion: vi.fn().mockReturnValue(() => {}),
  getAccelerometer: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    z: 9.8,
    timestamp: Date.now(),
    includesGravity: true,
  }),
  getGyroscope: vi.fn().mockResolvedValue({
    x: 0,
    y: 0,
    z: 0,
    timestamp: Date.now(),
  }),
  getOrientation: vi.fn().mockResolvedValue({
    alpha: 0,
    beta: 0,
    gamma: 0,
    timestamp: Date.now(),
    absolute: false,
  }),
  getPermissionStatus: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted'),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    hasAccelerometer: true,
    hasGyroscope: true,
    hasMagnetometer: true,
    hasOrientation: true,
    requiresPermission: false,
  }),
  ...overrides,
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

describe('Convenience Functions', () => {
  let mockProvider: MotionProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  describe('startAccelerometer', () => {
    it('should start accelerometer updates', () => {
      const callback = vi.fn()
      const stop = startAccelerometer(callback)
      expect(mockProvider.startAccelerometer).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })

    it('should pass options', () => {
      const callback = vi.fn()
      startAccelerometer(callback, { frequency: 30 })
      expect(mockProvider.startAccelerometer).toHaveBeenCalledWith(callback, { frequency: 30 })
    })
  })

  describe('startGyroscope', () => {
    it('should start gyroscope updates', () => {
      const callback = vi.fn()
      const stop = startGyroscope(callback)
      expect(mockProvider.startGyroscope).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })
  })

  describe('startMagnetometer', () => {
    it('should start magnetometer updates', () => {
      const callback = vi.fn()
      const stop = startMagnetometer(callback)
      expect(mockProvider.startMagnetometer).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })
  })

  describe('startOrientation', () => {
    it('should start orientation updates', () => {
      const callback = vi.fn()
      const stop = startOrientation(callback)
      expect(mockProvider.startOrientation).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })
  })

  describe('startMotion', () => {
    it('should start combined motion updates', () => {
      const callback = vi.fn()
      const stop = startMotion(callback)
      expect(mockProvider.startMotion).toHaveBeenCalledWith(callback, undefined)
      expect(typeof stop).toBe('function')
    })
  })

  describe('getAccelerometer', () => {
    it('should return accelerometer data', async () => {
      const data = await getAccelerometer()
      expect(data.z).toBe(9.8)
      expect(data.includesGravity).toBe(true)
      expect(mockProvider.getAccelerometer).toHaveBeenCalled()
    })
  })

  describe('getGyroscope', () => {
    it('should return gyroscope data', async () => {
      const data = await getGyroscope()
      expect(data.x).toBe(0)
      expect(data.y).toBe(0)
      expect(data.z).toBe(0)
      expect(mockProvider.getGyroscope).toHaveBeenCalled()
    })
  })

  describe('getOrientation', () => {
    it('should return orientation data', async () => {
      const data = await getOrientation()
      expect(data.alpha).toBe(0)
      expect(data.beta).toBe(0)
      expect(data.gamma).toBe(0)
      expect(mockProvider.getOrientation).toHaveBeenCalled()
    })
  })

  describe('getPermissionStatus', () => {
    it('should return permission status', async () => {
      const status = await getPermissionStatus()
      expect(status).toBe('granted')
      expect(mockProvider.getPermissionStatus).toHaveBeenCalled()
    })
  })

  describe('requestPermission', () => {
    it('should request permission', async () => {
      const status = await requestPermission()
      expect(status).toBe('granted')
      expect(mockProvider.requestPermission).toHaveBeenCalled()
    })
  })

  describe('getCapabilities', () => {
    it('should return motion capabilities', async () => {
      const capabilities = await getCapabilities()
      expect(capabilities.supported).toBe(true)
      expect(capabilities.hasAccelerometer).toBe(true)
      expect(capabilities.hasGyroscope).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })
})
