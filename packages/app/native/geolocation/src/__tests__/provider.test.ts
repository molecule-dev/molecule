import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getProvider, setProvider } from '../provider.js'
import type { GeolocationProvider, LocationPermission, Position } from '../types.js'

describe('geolocation/provider', () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should create a web provider if none is set', () => {
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.checkPermission).toBe('function')
      expect(typeof provider.getCurrentPosition).toBe('function')
    })
  })
})
