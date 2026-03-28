import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { GeolocationProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let geocode: typeof ProviderModule.geocode
let reverseGeocode: typeof ProviderModule.reverseGeocode
let distance: typeof ProviderModule.distance
let autocomplete: typeof ProviderModule.autocomplete
let getTimezone: typeof ProviderModule.getTimezone

const createMockProvider = (overrides?: Partial<GeolocationProvider>): GeolocationProvider => ({
  geocode: vi.fn().mockResolvedValue([
    {
      lat: 37.4224764,
      lng: -122.0842499,
      formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      components: { city: 'Mountain View', state: 'California', country: 'United States' },
      placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
    },
  ]),
  reverseGeocode: vi.fn().mockResolvedValue([
    {
      lat: 37.4224764,
      lng: -122.0842499,
      formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      components: { city: 'Mountain View', state: 'California', country: 'United States' },
    },
  ]),
  distance: vi.fn().mockReturnValue(5572.47),
  ...overrides,
})

describe('geolocation provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    geocode = providerModule.geocode
    reverseGeocode = providerModule.reverseGeocode
    distance = providerModule.distance
    autocomplete = providerModule.autocomplete
    getTimezone = providerModule.getTimezone
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Geolocation provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: GeolocationProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate geocode to provider', async () => {
      const results = await geocode('1600 Amphitheatre Parkway')
      expect(mockProvider.geocode).toHaveBeenCalledWith('1600 Amphitheatre Parkway')
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(37.4224764)
    })

    it('should delegate reverseGeocode to provider', async () => {
      const results = await reverseGeocode(37.4224764, -122.0842499)
      expect(mockProvider.reverseGeocode).toHaveBeenCalledWith(37.4224764, -122.0842499)
      expect(results).toHaveLength(1)
      expect(results[0].formattedAddress).toContain('Amphitheatre Parkway')
    })

    it('should delegate distance to provider', () => {
      const from = { lat: 40.7128, lng: -74.006 }
      const to = { lat: 34.0522, lng: -118.2437 }
      const result = distance(from, to, 'km')
      expect(mockProvider.distance).toHaveBeenCalledWith(from, to, 'km')
      expect(result).toBe(5572.47)
    })

    it('should delegate distance without unit', () => {
      const from = { lat: 40.7128, lng: -74.006 }
      const to = { lat: 34.0522, lng: -118.2437 }
      distance(from, to)
      expect(mockProvider.distance).toHaveBeenCalledWith(from, to, undefined)
    })
  })

  describe('optional methods', () => {
    it('should delegate autocomplete when supported', async () => {
      const mockAutocomplete = vi.fn().mockResolvedValue([
        {
          placeId: 'place123',
          mainText: 'Googleplex',
          secondaryText: 'Mountain View, CA',
          description: 'Googleplex, Mountain View, CA, USA',
        },
      ])
      const mockProvider = createMockProvider({ autocomplete: mockAutocomplete })
      setProvider(mockProvider)

      const options = { limit: 5, countries: ['US'] }
      const results = await autocomplete('Google', options)
      expect(mockAutocomplete).toHaveBeenCalledWith('Google', options)
      expect(results).toHaveLength(1)
      expect(results[0].placeId).toBe('place123')
    })

    it('should throw when autocomplete is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(autocomplete('test')).rejects.toThrow(
        'The bonded geolocation provider does not support autocomplete.',
      )
    })

    it('should delegate getTimezone when supported', async () => {
      const mockGetTimezone = vi.fn().mockResolvedValue({
        timeZoneId: 'America/Los_Angeles',
        timeZoneName: 'Pacific Daylight Time',
        rawOffset: -28800,
        dstOffset: 3600,
      })
      const mockProvider = createMockProvider({ getTimezone: mockGetTimezone })
      setProvider(mockProvider)

      const result = await getTimezone(37.4224764, -122.0842499)
      expect(mockGetTimezone).toHaveBeenCalledWith(37.4224764, -122.0842499)
      expect(result.timeZoneId).toBe('America/Los_Angeles')
    })

    it('should throw when getTimezone is not supported', async () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      await expect(getTimezone(37.4224764, -122.0842499)).rejects.toThrow(
        'The bonded geolocation provider does not support timezone lookups.',
      )
    })
  })
})
