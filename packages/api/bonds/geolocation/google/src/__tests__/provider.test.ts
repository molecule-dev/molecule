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

describe('google geolocation provider', () => {
  let provider: GeolocationProvider

  beforeEach(() => {
    provider = createProvider({ apiKey: 'test-api-key' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] })),
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
      expect(provider.getTimezone).toBeInstanceOf(Function)
    })
  })

  describe('geocode', () => {
    it('should geocode an address', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'OK',
            results: [
              {
                address_components: [
                  { long_name: '1600', short_name: '1600', types: ['street_number'] },
                  {
                    long_name: 'Amphitheatre Parkway',
                    short_name: 'Amphitheatre Pkwy',
                    types: ['route'],
                  },
                  { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
                  {
                    long_name: 'California',
                    short_name: 'CA',
                    types: ['administrative_area_level_1'],
                  },
                  { long_name: 'United States', short_name: 'US', types: ['country'] },
                  { long_name: '94043', short_name: '94043', types: ['postal_code'] },
                ],
                formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
                geometry: {
                  location: { lat: 37.4224764, lng: -122.0842499 },
                  bounds: {
                    northeast: { lat: 37.4238, lng: -122.0829 },
                    southwest: { lat: 37.4211, lng: -122.0856 },
                  },
                },
                place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
                types: ['street_address'],
              },
            ],
          }),
        ),
      )

      const results = await provider.geocode('1600 Amphitheatre Parkway, Mountain View, CA')
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(37.4224764)
      expect(results[0].lng).toBe(-122.0842499)
      expect(results[0].formattedAddress).toBe(
        '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      )
      expect(results[0].components.streetNumber).toBe('1600')
      expect(results[0].components.street).toBe('Amphitheatre Parkway')
      expect(results[0].components.city).toBe('Mountain View')
      expect(results[0].components.state).toBe('California')
      expect(results[0].components.stateCode).toBe('CA')
      expect(results[0].components.country).toBe('United States')
      expect(results[0].components.countryCode).toBe('US')
      expect(results[0].components.postalCode).toBe('94043')
      expect(results[0].placeId).toBe('ChIJ2eUgeAK6j4ARbn5u_wAGqWA')
      expect(results[0].bounds).toBeDefined()
      expect(results[0].bounds!.northeast.lat).toBe(37.4238)
    })

    it('should return empty array for zero results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'ZERO_RESULTS',
            results: [],
          }),
        ),
      )

      const results = await provider.geocode('nonexistent place xyz')
      expect(results).toHaveLength(0)
    })

    it('should throw on API error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'REQUEST_DENIED',
            error_message: 'The provided API key is invalid.',
          }),
        ),
      )

      await expect(provider.geocode('test')).rejects.toThrow('Google Geocoding API error')
    })

    it('should include API key in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('key=test-api-key')
    })

    it('should include language and region when configured', async () => {
      const p = createProvider({ apiKey: 'test-key', language: 'fr', region: 'FR' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('Paris')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('language=fr')
      expect(calledUrl).toContain('region=FR')
    })
  })

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'OK',
            results: [
              {
                address_components: [
                  { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
                  { long_name: 'United States', short_name: 'US', types: ['country'] },
                ],
                formatted_address: 'Mountain View, CA, USA',
                geometry: {
                  location: { lat: 37.4224764, lng: -122.0842499 },
                },
                place_id: 'test-place-id',
                types: ['locality'],
              },
            ],
          }),
        ),
      )

      const results = await provider.reverseGeocode(37.4224764, -122.0842499)
      expect(results).toHaveLength(1)
      expect(results[0].formattedAddress).toBe('Mountain View, CA, USA')
      expect(results[0].components.city).toBe('Mountain View')
    })

    it('should send latlng parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.reverseGeocode(40.7128, -74.006)
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('latlng=40.7128')
      expect(calledUrl).toContain('-74.006')
    })
  })

  describe('distance', () => {
    it('should calculate distance between two points in km', () => {
      const nyc: { lat: number; lng: number } = { lat: 40.7128, lng: -74.006 }
      const la: { lat: number; lng: number } = { lat: 34.0522, lng: -118.2437 }
      const km = provider.distance(nyc, la)

      // NYC to LA is approximately 3944 km
      expect(km).toBeGreaterThan(3900)
      expect(km).toBeLessThan(4000)
    })

    it('should calculate distance in miles', () => {
      const nyc: { lat: number; lng: number } = { lat: 40.7128, lng: -74.006 }
      const la: { lat: number; lng: number } = { lat: 34.0522, lng: -118.2437 }
      const mi = provider.distance(nyc, la, 'mi')

      // NYC to LA is approximately 2451 miles
      expect(mi).toBeGreaterThan(2400)
      expect(mi).toBeLessThan(2500)
    })

    it('should return 0 for same point', () => {
      const point: { lat: number; lng: number } = { lat: 51.5074, lng: -0.1278 }
      expect(provider.distance(point, point)).toBe(0)
    })

    it('should default to km', () => {
      const a: { lat: number; lng: number } = { lat: 48.8566, lng: 2.3522 }
      const b: { lat: number; lng: number } = { lat: 51.5074, lng: -0.1278 }
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
            status: 'OK',
            predictions: [
              {
                place_id: 'place-1',
                structured_formatting: {
                  main_text: 'Googleplex',
                  secondary_text: 'Mountain View, CA, USA',
                },
                description: 'Googleplex, Mountain View, CA, USA',
              },
              {
                place_id: 'place-2',
                structured_formatting: {
                  main_text: 'Google Building 40',
                  secondary_text: 'Mountain View, CA, USA',
                },
                description: 'Google Building 40, Mountain View, CA, USA',
              },
            ],
          }),
        ),
      )

      const results = await provider.autocomplete!('Google')
      expect(results).toHaveLength(2)
      expect(results[0].placeId).toBe('place-1')
      expect(results[0].mainText).toBe('Googleplex')
      expect(results[0].secondaryText).toBe('Mountain View, CA, USA')
      expect(results[0].description).toBe('Googleplex, Mountain View, CA, USA')
    })

    it('should pass options to API', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse({ status: 'OK', predictions: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await provider.autocomplete!('test', {
        location: { lat: 37.4, lng: -122.0 },
        radius: 5000,
        countries: ['US', 'CA'],
        language: 'en',
        sessionToken: 'session-123',
      })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('location=37.4')
      expect(calledUrl).toContain('radius=5000')
      expect(calledUrl).toContain('components=country%3AUS%7Ccountry%3ACA')
      expect(calledUrl).toContain('language=en')
      expect(calledUrl).toContain('sessiontoken=session-123')
    })

    it('should respect limit option', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'OK',
            predictions: [
              {
                place_id: 'p1',
                structured_formatting: { main_text: 'A', secondary_text: 'B' },
                description: 'A, B',
              },
              {
                place_id: 'p2',
                structured_formatting: { main_text: 'C', secondary_text: 'D' },
                description: 'C, D',
              },
              {
                place_id: 'p3',
                structured_formatting: { main_text: 'E', secondary_text: 'F' },
                description: 'E, F',
              },
            ],
          }),
        ),
      )

      const results = await provider.autocomplete!('test', { limit: 2 })
      expect(results).toHaveLength(2)
    })
  })

  describe('getTimezone', () => {
    it('should return timezone info', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'OK',
            timeZoneId: 'America/New_York',
            timeZoneName: 'Eastern Standard Time',
            rawOffset: -18000,
            dstOffset: 0,
          }),
        ),
      )

      const tz = await provider.getTimezone!(40.7128, -74.006)
      expect(tz.timeZoneId).toBe('America/New_York')
      expect(tz.timeZoneName).toBe('Eastern Standard Time')
      expect(tz.rawOffset).toBe(-18000)
      expect(tz.dstOffset).toBe(0)
    })

    it('should include timestamp in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          status: 'OK',
          timeZoneId: 'UTC',
          timeZoneName: 'Coordinated Universal Time',
          rawOffset: 0,
          dstOffset: 0,
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      await provider.getTimezone!(0, 0)
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('timestamp=')
    })

    it('should throw on API error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            status: 'INVALID_REQUEST',
            error_message: 'Invalid location.',
          }),
        ),
      )

      await expect(provider.getTimezone!(200, 200)).rejects.toThrow('Google Timezone API error')
    })
  })

  describe('error handling', () => {
    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      await expect(provider.geocode('test')).rejects.toThrow('failed with status 500')
    })

    it('should handle fetch abort on timeout', async () => {
      const p = createProvider({ apiKey: 'test-key', timeout: 50 })
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
      const p = createProvider({ apiKey: 'test-key', baseUrl: 'https://proxy.example.com' })
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 'OK', results: [] }))
      vi.stubGlobal('fetch', mockFetch)

      await p.geocode('test')
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.example.com/')).toBe(true)
    })
  })
})
