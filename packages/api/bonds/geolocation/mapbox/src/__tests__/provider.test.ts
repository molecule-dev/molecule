import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GeolocationProvider } from '@molecule/api-geolocation'

import { createProvider } from '../provider.js'

/**
 * Creates a mock fetch response.
 */
const mockFetchResponse = (data: Record<string, unknown>, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/**
 * Creates a Mapbox geocoding feature fixture.
 */
const createFeature = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'address.123',
  type: 'Feature',
  properties: {
    mapbox_id: 'dXJuOm1i',
    feature_type: 'address',
    full_address: '1600 Amphitheatre Parkway, Mountain View, California 94043, United States',
    name: '1600 Amphitheatre Parkway',
    place_formatted: 'Mountain View, California 94043, United States',
    context: {
      address: { address_number: '1600', name: 'Amphitheatre Parkway' },
      street: { name: 'Amphitheatre Parkway' },
      neighborhood: { name: 'Googleplex' },
      postcode: { name: '94043' },
      place: { name: 'Mountain View' },
      district: { name: 'Santa Clara County' },
      region: { name: 'California', region_code: 'CA' },
      country: { name: 'United States', country_code: 'us' },
    },
    ...overrides,
  },
  geometry: {
    type: 'Point',
    coordinates: [-122.0842499, 37.4224764],
  },
  bbox: [-122.0856, 37.4211, -122.0829, 37.4238] as [number, number, number, number],
})

describe('mapbox geolocation provider', () => {
  let provider: GeolocationProvider

  beforeEach(() => {
    provider = createProvider({ accessToken: 'test-token' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] })),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with required config', () => {
      expect(provider).toBeDefined()
      expect(provider.geocode).toBeInstanceOf(Function)
      expect(provider.reverseGeocode).toBeInstanceOf(Function)
      expect(provider.distance).toBeInstanceOf(Function)
      expect(provider.autocomplete).toBeInstanceOf(Function)
    })

    it('should not implement getTimezone', () => {
      expect(provider.getTimezone).toBeUndefined()
    })
  })

  describe('geocode', () => {
    it('should geocode an address', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            type: 'FeatureCollection',
            features: [createFeature()],
          }),
        ),
      )

      const results = await provider.geocode('1600 Amphitheatre Parkway, Mountain View, CA')
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(37.4224764)
      expect(results[0].lng).toBe(-122.0842499)
      expect(results[0].formattedAddress).toBe(
        '1600 Amphitheatre Parkway, Mountain View, California 94043, United States',
      )
      expect(results[0].components.streetNumber).toBe('1600')
      expect(results[0].components.street).toBe('Amphitheatre Parkway')
      expect(results[0].components.city).toBe('Mountain View')
      expect(results[0].components.state).toBe('California')
      expect(results[0].components.stateCode).toBe('CA')
      expect(results[0].components.country).toBe('United States')
      expect(results[0].components.countryCode).toBe('US')
      expect(results[0].components.postalCode).toBe('94043')
      expect(results[0].components.county).toBe('Santa Clara County')
      expect(results[0].components.neighborhood).toBe('Googleplex')
      expect(results[0].placeId).toBe('dXJuOm1i')
      expect(results[0].bounds).toBeDefined()
      expect(results[0].bounds!.northeast.lat).toBe(37.4238)
      expect(results[0].bounds!.northeast.lng).toBe(-122.0829)
      expect(results[0].bounds!.southwest.lat).toBe(37.4211)
      expect(results[0].bounds!.southwest.lng).toBe(-122.0856)
    })

    it('should return empty array for no results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            type: 'FeatureCollection',
            features: [],
          }),
        ),
      )

      const results = await provider.geocode('nonexistent place xyz')
      expect(results).toHaveLength(0)
    })

    it('should include access_token in request', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('access_token=test-token')
    })

    it('should include language and country when configured', async () => {
      const p = createProvider({ accessToken: 'test-token', language: 'fr', country: 'FR' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('Paris')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('language=fr')
      expect(calledUrl).toContain('country=FR')
    })

    it('should use forward geocoding endpoint', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search/geocode/v6/forward')
    })

    it('should handle feature without bbox', async () => {
      const feature = createFeature()
      delete (feature as Record<string, unknown>)['bbox']

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            type: 'FeatureCollection',
            features: [feature],
          }),
        ),
      )

      const results = await provider.geocode('test')
      expect(results[0].bounds).toBeUndefined()
    })

    it('should fall back to name when full_address is missing', async () => {
      const feature = createFeature({ full_address: undefined, place_formatted: undefined })

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            type: 'FeatureCollection',
            features: [feature],
          }),
        ),
      )

      const results = await provider.geocode('test')
      expect(results[0].formattedAddress).toBe('1600 Amphitheatre Parkway')
    })
  })

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            type: 'FeatureCollection',
            features: [
              createFeature({
                full_address: 'Mountain View, CA, USA',
              }),
            ],
          }),
        ),
      )

      const results = await provider.reverseGeocode(37.4224764, -122.0842499)
      expect(results).toHaveLength(1)
      expect(results[0].formattedAddress).toBe('Mountain View, CA, USA')
    })

    it('should use reverse geocoding endpoint with latitude and longitude params', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.reverseGeocode(40.7128, -74.006)
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search/geocode/v6/reverse')
      expect(calledUrl).toContain('latitude=40.7128')
      expect(calledUrl).toContain('longitude=-74.006')
    })
  })

  describe('distance', () => {
    it('should calculate distance between two points in km', () => {
      const nyc: LatLng = { lat: 40.7128, lng: -74.006 }
      const la: LatLng = { lat: 34.0522, lng: -118.2437 }
      const km = provider.distance(nyc, la)

      expect(km).toBeGreaterThan(3900)
      expect(km).toBeLessThan(4000)
    })

    it('should calculate distance in miles', () => {
      const nyc: LatLng = { lat: 40.7128, lng: -74.006 }
      const la: LatLng = { lat: 34.0522, lng: -118.2437 }
      const mi = provider.distance(nyc, la, 'mi')

      expect(mi).toBeGreaterThan(2400)
      expect(mi).toBeLessThan(2500)
    })

    it('should return 0 for same point', () => {
      const point: LatLng = { lat: 51.5074, lng: -0.1278 }
      expect(provider.distance(point, point)).toBe(0)
    })

    it('should default to km', () => {
      const a: LatLng = { lat: 48.8566, lng: 2.3522 }
      const b: LatLng = { lat: 51.5074, lng: -0.1278 }
      const km = provider.distance(a, b)
      const mi = provider.distance(a, b, 'mi')
      expect(km).toBeGreaterThan(mi)
    })
  })

  describe('autocomplete', () => {
    it('should return place suggestions', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            suggestions: [
              {
                name: 'Googleplex',
                mapbox_id: 'poi-1',
                feature_type: 'poi',
                full_address: 'Googleplex, Mountain View, CA, USA',
                place_formatted: 'Mountain View, CA, USA',
              },
              {
                name: 'Google Building 40',
                mapbox_id: 'poi-2',
                feature_type: 'poi',
                full_address: 'Google Building 40, Mountain View, CA, USA',
                place_formatted: 'Mountain View, CA, USA',
              },
            ],
          }),
        ),
      )

      const results = await provider.autocomplete!('Google')
      expect(results).toHaveLength(2)
      expect(results[0].placeId).toBe('poi-1')
      expect(results[0].mainText).toBe('Googleplex')
      expect(results[0].secondaryText).toBe('Mountain View, CA, USA')
      expect(results[0].description).toBe('Googleplex, Mountain View, CA, USA')
    })

    it('should use search box suggest endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search/searchbox/v1/suggest')
    })

    it('should pass options to API', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test', {
        location: { lat: 37.4, lng: -122.0 },
        countries: ['US', 'CA'],
        language: 'en',
        limit: 5,
        sessionToken: 'session-123',
      })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('proximity=-122')
      expect(calledUrl).toContain('country=US%2CCA')
      expect(calledUrl).toContain('language=en')
      expect(calledUrl).toContain('limit=5')
      expect(calledUrl).toContain('session_token=session-123')
    })

    it('should cap limit at 10', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test', { limit: 25 })
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('limit=10')
    })

    it('should handle empty suggestions', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] })))

      const results = await provider.autocomplete!('xyznonexistent')
      expect(results).toHaveLength(0)
    })

    it('should use config language as fallback', async () => {
      const p = createProvider({ accessToken: 'test-token', language: 'de' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.autocomplete!('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('language=de')
    })

    it('should prefer option language over config language', async () => {
      const p = createProvider({ accessToken: 'test-token', language: 'de' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.autocomplete!('test', { language: 'fr' })
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('language=fr')
    })

    it('should use config country as fallback for autocomplete', async () => {
      const p = createProvider({ accessToken: 'test-token', country: 'DE' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ suggestions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.autocomplete!('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('country=DE')
    })
  })

  describe('error handling', () => {
    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 401)))

      await expect(provider.geocode('test')).rejects.toThrow('failed with status 401')
    })

    it('should handle fetch abort on timeout', async () => {
      const p = createProvider({ accessToken: 'test-token', timeout: 50 })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          (_url: string, options: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              options.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }),
        ),
      )

      await expect(p.geocode('test')).rejects.toThrow()
    })
  })

  describe('base URL override', () => {
    it('should use custom base URL', async () => {
      const p = createProvider({ accessToken: 'test-token', baseUrl: 'https://proxy.example.com' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ type: 'FeatureCollection', features: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.example.com/')).toBe(true)
    })
  })
})

/** LatLng type alias for test readability. */
interface LatLng {
  lat: number
  lng: number
}
