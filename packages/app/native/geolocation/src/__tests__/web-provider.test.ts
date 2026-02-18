import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GeolocationProvider } from '../types.js'
import { createWebGeolocationProvider } from '../web-provider.js'

describe('geolocation/web-provider', () => {
  let provider: GeolocationProvider
  let mockPosition: GeolocationPosition
  let mockNavigator: {
    permissions?: { query: ReturnType<typeof vi.fn> }
    geolocation?: {
      getCurrentPosition: ReturnType<typeof vi.fn>
      watchPosition: ReturnType<typeof vi.fn>
      clearWatch: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    mockPosition = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        altitude: 100,
        altitudeAccuracy: 5,
        heading: 90,
        speed: 10,
      },
      timestamp: Date.now(),
    }

    mockNavigator = {
      permissions: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
        watchPosition: vi.fn((success) => {
          success(mockPosition)
          return 123
        }),
        clearWatch: vi.fn(),
      },
    }

    vi.stubGlobal('navigator', mockNavigator)

    provider = createWebGeolocationProvider()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('checkPermission', () => {
    it('should return granted when permission is granted', async () => {
      const result = await provider.checkPermission()
      expect(result).toBe('granted')
    })

    it('should return prompt when permissions API is not available', async () => {
      mockNavigator.permissions = undefined
      vi.stubGlobal('navigator', mockNavigator)

      const newProvider = createWebGeolocationProvider()
      const result = await newProvider.checkPermission()
      expect(result).toBe('prompt')
    })

    it('should return prompt when permissions query fails', async () => {
      mockNavigator.permissions = {
        query: vi.fn().mockRejectedValue(new Error('Not supported')),
      }
      vi.stubGlobal('navigator', mockNavigator)

      const newProvider = createWebGeolocationProvider()
      const result = await newProvider.checkPermission()
      expect(result).toBe('prompt')
    })
  })

  describe('requestPermission', () => {
    it('should return granted when getCurrentPosition succeeds', async () => {
      const result = await provider.requestPermission()
      expect(result).toBe('granted')
    })

    it('should return denied when permission is denied', async () => {
      const error = {
        code: 1, // PERMISSION_DENIED
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      mockNavigator.geolocation!.getCurrentPosition.mockImplementation(
        (_: unknown, errorCallback: (err: unknown) => void) => errorCallback(error),
      )

      const newProvider = createWebGeolocationProvider()
      const result = await newProvider.requestPermission()
      expect(result).toBe('denied')
    })
  })

  describe('getCurrentPosition', () => {
    it('should return position when successful', async () => {
      const result = await provider.getCurrentPosition()
      expect(result.coords.latitude).toBe(37.7749)
      expect(result.coords.longitude).toBe(-122.4194)
      expect(result.coords.accuracy).toBe(10)
    })

    it('should convert position correctly', async () => {
      const result = await provider.getCurrentPosition()
      expect(result.coords.altitude).toBe(100)
      expect(result.coords.altitudeAccuracy).toBe(5)
      expect(result.coords.heading).toBe(90)
      expect(result.coords.speed).toBe(10)
      expect(result.timestamp).toBeDefined()
    })

    it('should handle null optional values', async () => {
      mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }
      mockNavigator.geolocation!.getCurrentPosition.mockImplementation(
        (success: (pos: GeolocationPosition) => void) => success(mockPosition),
      )

      const newProvider = createWebGeolocationProvider()
      const result = await newProvider.getCurrentPosition()
      expect(result.coords.altitude).toBeUndefined()
      expect(result.coords.altitudeAccuracy).toBeUndefined()
    })

    it('should reject when geolocation is not supported', async () => {
      delete mockNavigator.geolocation
      vi.stubGlobal('navigator', mockNavigator)

      const newProvider = createWebGeolocationProvider()
      await expect(newProvider.getCurrentPosition()).rejects.toEqual({
        code: 'position_unavailable',
        message: 'Geolocation not supported',
      })
    })

    it('should handle POSITION_UNAVAILABLE error', async () => {
      const error = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      mockNavigator.geolocation!.getCurrentPosition.mockImplementation(
        (_: unknown, errorCallback: (err: unknown) => void) => errorCallback(error),
      )

      const newProvider = createWebGeolocationProvider()
      await expect(newProvider.getCurrentPosition()).rejects.toEqual({
        code: 'position_unavailable',
        message: 'Position unavailable',
      })
    })

    it('should handle TIMEOUT error', async () => {
      const error = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      mockNavigator.geolocation!.getCurrentPosition.mockImplementation(
        (_: unknown, errorCallback: (err: unknown) => void) => errorCallback(error),
      )

      const newProvider = createWebGeolocationProvider()
      await expect(newProvider.getCurrentPosition()).rejects.toEqual({
        code: 'timeout',
        message: 'Timeout',
      })
    })

    it('should pass options to geolocation API', async () => {
      await provider.getCurrentPosition({
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 5000,
      })

      expect(mockNavigator.geolocation!.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        },
      )
    })
  })

  describe('watchPosition', () => {
    it('should return a watch ID', () => {
      const onSuccess = vi.fn()
      const watchId = provider.watchPosition(onSuccess)
      expect(watchId).toBeDefined()
      expect(typeof watchId).toBe('string')
    })

    it('should call success callback with position', () => {
      const onSuccess = vi.fn()
      provider.watchPosition(onSuccess)
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          coords: expect.objectContaining({
            latitude: 37.7749,
            longitude: -122.4194,
          }),
        }),
      )
    })

    it('should call error callback on error', () => {
      const error = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }
      mockNavigator.geolocation!.watchPosition.mockImplementation(
        (_: unknown, errorCallback: (err: unknown) => void) => {
          errorCallback(error)
          return 123
        },
      )

      const newProvider = createWebGeolocationProvider()
      const onSuccess = vi.fn()
      const onError = vi.fn()
      newProvider.watchPosition(onSuccess, onError)

      expect(onError).toHaveBeenCalledWith({
        code: 'permission_denied',
        message: 'Permission denied',
      })
    })

    it('should return empty string when geolocation is not supported', () => {
      delete mockNavigator.geolocation
      vi.stubGlobal('navigator', mockNavigator)

      const newProvider = createWebGeolocationProvider()
      const onSuccess = vi.fn()
      const onError = vi.fn()
      const watchId = newProvider.watchPosition(onSuccess, onError)

      expect(watchId).toBe('')
      expect(onError).toHaveBeenCalledWith({
        code: 'position_unavailable',
        message: 'Geolocation not supported',
      })
    })
  })

  describe('clearWatch', () => {
    it('should clear the watch', () => {
      const onSuccess = vi.fn()
      const watchId = provider.watchPosition(onSuccess)
      provider.clearWatch(watchId)
      expect(mockNavigator.geolocation!.clearWatch).toHaveBeenCalled()
    })

    it('should handle clearing non-existent watch', () => {
      // Should not throw
      provider.clearWatch('non-existent-id')
      expect(true).toBe(true)
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance using haversine formula', () => {
      const from = { latitude: 37.7749, longitude: -122.4194 }
      const to = { latitude: 37.7849, longitude: -122.4094 }
      const distance = provider.calculateDistance(from, to)

      // Should be approximately 1400 meters
      expect(distance).toBeGreaterThan(1000)
      expect(distance).toBeLessThan(2000)
    })

    it('should return 0 for same coordinates', () => {
      const point = { latitude: 37.7749, longitude: -122.4194 }
      const distance = provider.calculateDistance(point, point)
      expect(distance).toBe(0)
    })
  })
})
