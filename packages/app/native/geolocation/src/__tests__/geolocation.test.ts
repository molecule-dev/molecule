import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateDistance,
  checkPermission,
  clearWatch,
  getCurrentPosition,
  requestPermission,
  watchPosition,
} from '../geolocation.js'
import { setProvider } from '../provider.js'
import type { GeolocationProvider, LocationPermission, Position } from '../types.js'

describe('geolocation/geolocation', () => {
  let mockProvider: GeolocationProvider

  beforeEach(() => {
    mockProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted' as LocationPermission),
      requestPermission: vi.fn().mockResolvedValue('granted' as LocationPermission),
      getCurrentPosition: vi.fn().mockResolvedValue({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
        },
        timestamp: Date.now(),
      } as Position),
      watchPosition: vi.fn().mockReturnValue('watch-id-123'),
      clearWatch: vi.fn(),
      calculateDistance: vi.fn().mockReturnValue(1000),
    }

    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkPermission', () => {
    it('should delegate to provider', async () => {
      const result = await checkPermission()
      expect(result).toBe('granted')
      expect(mockProvider.checkPermission).toHaveBeenCalled()
    })
  })

  describe('requestPermission', () => {
    it('should delegate to provider', async () => {
      const result = await requestPermission()
      expect(result).toBe('granted')
      expect(mockProvider.requestPermission).toHaveBeenCalled()
    })
  })

  describe('getCurrentPosition', () => {
    it('should delegate to provider', async () => {
      const result = await getCurrentPosition()
      expect(result.coords.latitude).toBe(37.7749)
      expect(mockProvider.getCurrentPosition).toHaveBeenCalled()
    })

    it('should pass options to provider', async () => {
      await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 })
      expect(mockProvider.getCurrentPosition).toHaveBeenCalledWith({
        enableHighAccuracy: true,
        timeout: 5000,
      })
    })
  })

  describe('watchPosition', () => {
    it('should delegate to provider', () => {
      const onSuccess = vi.fn()
      const watchId = watchPosition(onSuccess)
      expect(watchId).toBe('watch-id-123')
      expect(mockProvider.watchPosition).toHaveBeenCalledWith(onSuccess, undefined, undefined)
    })

    it('should pass error callback and options', () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()
      const options = { enableHighAccuracy: true }
      watchPosition(onSuccess, onError, options)
      expect(mockProvider.watchPosition).toHaveBeenCalledWith(onSuccess, onError, options)
    })
  })

  describe('clearWatch', () => {
    it('should delegate to provider', () => {
      clearWatch('watch-id-123')
      expect(mockProvider.clearWatch).toHaveBeenCalledWith('watch-id-123')
    })
  })

  describe('calculateDistance', () => {
    it('should delegate to provider', () => {
      const from = { latitude: 37.7749, longitude: -122.4194 }
      const to = { latitude: 37.7849, longitude: -122.4094 }
      const result = calculateDistance(from, to)
      expect(result).toBe(1000)
      expect(mockProvider.calculateDistance).toHaveBeenCalledWith(from, to)
    })
  })
})
