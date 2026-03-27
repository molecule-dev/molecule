import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GeolocationProvider } from '@molecule/api-geolocation'

import { createProvider } from '../provider.js'

/**
 * Creates a mock fetch response.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/**
 * Creates a Nominatim search result fixture.
 */
const createResult = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  place_id: 123456,
  osm_type: 'way',
  osm_id: 789012,
  lat: '37.4224764',
  lon: '-122.0842499',
  display_name:
    '1600 Amphitheatre Parkway, Mountain View, Santa Clara County, California, 94043, United States',
  name: 'Googleplex',
  importance: 0.75,
  address: {
    house_number: '1600',
    road: 'Amphitheatre Parkway',
    neighbourhood: 'Googleplex',
    city: 'Mountain View',
    county: 'Santa Clara County',
    state: 'California',
    'ISO3166-2-lvl4': 'US-CA',
    postcode: '94043',
    country: 'United States',
    country_code: 'us',
  },
  boundingbox: ['37.4211', '37.4238', '-122.0856', '-122.0829'] as [string, string, string, string],
  ...overrides,
})

describe('nominatim geolocation provider', () => {
  let provider: GeolocationProvider

  beforeEach(() => {
    provider = createProvider({ userAgent: 'test-app/1.0' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([])))
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
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([createResult()])))

      const results = await provider.geocode('1600 Amphitheatre Parkway, Mountain View, CA')
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(37.4224764)
      expect(results[0].lng).toBe(-122.0842499)
      expect(results[0].formattedAddress).toBe(
        '1600 Amphitheatre Parkway, Mountain View, Santa Clara County, California, 94043, United States',
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
      expect(results[0].placeId).toBe('123456')
    })

    it('should return bounds from boundingbox', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([createResult()])))

      const results = await provider.geocode('test')
      expect(results[0].bounds).toBeDefined()
      expect(results[0].bounds!.northeast.lat).toBe(37.4238)
      expect(results[0].bounds!.northeast.lng).toBe(-122.0829)
      expect(results[0].bounds!.southwest.lat).toBe(37.4211)
      expect(results[0].bounds!.southwest.lng).toBe(-122.0856)
    })

    it('should return empty array for no results', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([])))

      const results = await provider.geocode('nonexistent place xyz')
      expect(results).toHaveLength(0)
    })

    it('should include User-Agent header in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const options = mockFetch.mock.calls[0][1] as RequestInit
      expect((options.headers as Record<string, string>)['User-Agent']).toBe('test-app/1.0')
    })

    it('should use jsonv2 format with addressdetails', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('format=jsonv2')
      expect(calledUrl).toContain('addressdetails=1')
    })

    it('should use search endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search?')
    })

    it('should include language when configured', async () => {
      const p = createProvider({ userAgent: 'test-app', language: 'fr' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('Paris')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('accept-language=fr')
    })

    it('should include country codes when configured', async () => {
      const p = createProvider({ userAgent: 'test-app', countryCodes: ['US', 'CA'] })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('countrycodes=us%2Cca')
    })

    it('should include email when configured', async () => {
      const p = createProvider({ userAgent: 'test-app', email: 'admin@example.com' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('email=admin%40example.com')
    })

    it('should handle result without boundingbox', async () => {
      const result = createResult()
      delete (result as Record<string, unknown>)['boundingbox']

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.geocode('test')
      expect(results[0].bounds).toBeUndefined()
    })

    it('should handle result without address', async () => {
      const result = createResult()
      delete (result as Record<string, unknown>)['address']

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.geocode('test')
      expect(results[0].components).toEqual({})
    })

    it('should fall back to town when city is missing', async () => {
      const result = createResult({
        address: {
          town: 'SmallTown',
          state: 'California',
          country: 'United States',
          country_code: 'us',
        },
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.geocode('test')
      expect(results[0].components.city).toBe('SmallTown')
    })

    it('should fall back to village when city and town are missing', async () => {
      const result = createResult({
        address: {
          village: 'TinyVillage',
          state: 'California',
          country: 'United States',
          country_code: 'us',
        },
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.geocode('test')
      expect(results[0].components.city).toBe('TinyVillage')
    })

    it('should fall back to suburb for neighborhood', async () => {
      const result = createResult({
        address: {
          suburb: 'Downtown',
          city: 'TestCity',
          country: 'United States',
          country_code: 'us',
        },
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.geocode('test')
      expect(results[0].components.neighborhood).toBe('Downtown')
    })

    it('should respect custom limit config', async () => {
      const p = createProvider({ userAgent: 'test-app', limit: 5 })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('limit=5')
    })
  })

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse(
            createResult({
              display_name: 'Mountain View, CA, USA',
            }),
          ),
        ),
      )

      const results = await provider.reverseGeocode(37.4224764, -122.0842499)
      expect(results).toHaveLength(1)
      expect(results[0].formattedAddress).toBe('Mountain View, CA, USA')
    })

    it('should use reverse endpoint with lat and lon params', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(createResult()))
      vi.stubGlobal('fetch', mockFetch)

      await provider.reverseGeocode(40.7128, -74.006)
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/reverse?')
      expect(calledUrl).toContain('lat=40.7128')
      expect(calledUrl).toContain('lon=-74.006')
    })

    it('should return empty array when Nominatim returns error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            error: 'Unable to geocode',
          }),
        ),
      )

      const results = await provider.reverseGeocode(0, 0)
      expect(results).toHaveLength(0)
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
          mockFetchResponse([
            createResult({
              name: 'Googleplex',
              display_name: 'Googleplex, Mountain View, California, United States',
            }),
            createResult({
              place_id: 789,
              name: 'Google Building 40',
              display_name: 'Google Building 40, Mountain View, California, United States',
            }),
          ]),
        ),
      )

      const results = await provider.autocomplete!('Google')
      expect(results).toHaveLength(2)
      expect(results[0].placeId).toBe('123456')
      expect(results[0].mainText).toBe('Googleplex')
      expect(results[0].secondaryText).toBe('Mountain View, California, United States')
      expect(results[0].description).toBe('Googleplex, Mountain View, California, United States')
      expect(results[0].location).toEqual({ lat: 37.4224764, lng: -122.0842499 })
    })

    it('should use search endpoint for autocomplete', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/search?')
    })

    it('should pass options to API', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test', {
        location: { lat: 37.4, lng: -122.0 },
        countries: ['US', 'CA'],
        language: 'en',
        limit: 5,
      })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('viewbox=')
      expect(calledUrl).toContain('countrycodes=us%2Cca')
      expect(calledUrl).toContain('accept-language=en')
      expect(calledUrl).toContain('limit=5')
    })

    it('should handle empty results', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([])))

      const results = await provider.autocomplete!('xyznonexistent')
      expect(results).toHaveLength(0)
    })

    it('should use config country codes as fallback', async () => {
      const p = createProvider({ userAgent: 'test-app', countryCodes: ['DE'] })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.autocomplete!('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('countrycodes=de')
    })

    it('should prefer option countries over config country codes', async () => {
      const p = createProvider({ userAgent: 'test-app', countryCodes: ['DE'] })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.autocomplete!('test', { countries: ['FR'] })
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('countrycodes=fr')
      expect(calledUrl).not.toContain('countrycodes=de')
    })

    it('should use street as fallback when name is missing', async () => {
      const result = createResult()
      delete (result as Record<string, unknown>)['name']

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.autocomplete!('test')
      expect(results[0].mainText).toBe('Amphitheatre Parkway')
    })

    it('should use display_name first part as fallback when name and street are missing', async () => {
      const result = createResult({
        name: undefined,
        display_name: 'Some Place, Mountain View, CA',
        address: { country: 'United States', country_code: 'us' },
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse([result])))

      const results = await provider.autocomplete!('test')
      expect(results[0].mainText).toBe('Some Place')
    })

    it('should include viewbox when location is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test', {
        location: { lat: 40.0, lng: -74.0 },
        radius: 10_000,
      })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('viewbox=')
      expect(calledUrl).toContain('bounded=0')
    })
  })

  describe('error handling', () => {
    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      await expect(provider.geocode('test')).rejects.toThrow('failed with status 429')
    })

    it('should handle fetch abort on timeout', async () => {
      const p = createProvider({ userAgent: 'test-app', timeout: 50 })
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
      const p = createProvider({
        userAgent: 'test-app',
        baseUrl: 'https://nominatim.example.com',
      })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse([]))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://nominatim.example.com/')).toBe(true)
    })
  })
})

/** LatLng type alias for test readability. */
interface LatLng {
  lat: number
  lng: number
}
