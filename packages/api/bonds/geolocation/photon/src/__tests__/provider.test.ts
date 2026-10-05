import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GeolocationProvider } from '@molecule/api-geolocation'

import { createProvider } from '../provider.js'

/**
 * Creates a mock fetch response with a Photon FeatureCollection body.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/**
 * Creates a Photon feature fixture.
 */
const createFeature = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  geometry: { coordinates: [9.5215, 47.1411] },
  properties: {
    osm_id: 123456,
    osm_type: 'W',
    osm_key: 'building',
    osm_value: 'yes',
    name: 'Government House',
    housenumber: '1',
    street: 'Peter-Kaiser-Platz',
    postcode: '9490',
    city: 'Vaduz',
    state: 'Vaduz',
    country: 'Liechtenstein',
    countrycode: 'li',
    extent: [9.51, 47.15, 9.53, 47.13],
    ...overrides,
  },
})

/**
 * Reads the query string of the URL the provider fetched.
 */
const lastFetchUrl = (): string => {
  const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string
  return url
}

describe('photon geolocation provider', () => {
  let provider: GeolocationProvider

  beforeEach(() => {
    provider = createProvider({ baseUrl: 'https://photon.example.com' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({ features: [] })))
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

    it('should strip trailing slashes from the base URL', async () => {
      const p = createProvider({ baseUrl: 'https://photon.example.com///' })
      await p.geocode('Vaduz')
      expect(lastFetchUrl()).toMatch(/^https:\/\/photon\.example\.com\/api\?/)
    })
  })

  describe('geocode', () => {
    it('should geocode an address and map the feature', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ features: [createFeature()] })),
      )

      const results = await provider.geocode('Peter-Kaiser-Platz 1, Vaduz')
      expect(results).toHaveLength(1)
      expect(results[0].lat).toBe(47.1411)
      expect(results[0].lng).toBe(9.5215)
      expect(results[0].placeId).toBe('photon:w123456')
      expect(results[0].formattedAddress).toContain('Vaduz')
      expect(results[0].components.countryCode).toBe('LI')
      expect(results[0].components.postalCode).toBe('9490')
      expect(results[0].bounds?.southwest).toEqual({ lat: 47.13, lng: 9.51 })
      expect(results[0].bounds?.northeast).toEqual({ lat: 47.15, lng: 9.53 })
    })

    it('should send q, limit and lang params', async () => {
      const p = createProvider({ baseUrl: 'https://photon.example.com', language: 'de', limit: 3 })
      await p.geocode('Vaduz')
      const url = new URL(lastFetchUrl())
      expect(url.pathname).toBe('/api')
      expect(url.searchParams.get('q')).toBe('Vaduz')
      expect(url.searchParams.get('limit')).toBe('3')
      expect(url.searchParams.get('lang')).toBe('de')
    })

    it('should handle array-valued properties', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            features: [createFeature({ city: ['Vaduz'], state: null })],
          }),
        ),
      )

      const results = await provider.geocode('Vaduz')
      expect(results[0].components.city).toBe('Vaduz')
      expect(results[0].components.state).toBeUndefined()
    })

    it('should drop features without usable coordinates', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockFetchResponse({ features: [{ properties: { name: 'x' } }, createFeature()] }),
          ),
      )

      const results = await provider.geocode('Vaduz')
      expect(results).toHaveLength(1)
    })

    it('should filter by country after the query', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({
            features: [
              createFeature(),
              createFeature({ countrycode: 'ch', country: 'Switzerland' }),
            ],
          }),
        ),
      )

      const p = createProvider({ baseUrl: 'https://photon.example.com', countryCodes: ['CH'] })
      const results = await p.geocode('Vaduz')
      expect(results).toHaveLength(1)
      expect(results[0].components.countryCode).toBe('CH')
    })

    it('should return an empty array outside the loaded extract', async () => {
      const results = await provider.geocode('nowhere at all')
      expect(results).toEqual([])
    })

    it('should throw on an upstream error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))
      await expect(provider.geocode('Vaduz')).rejects.toThrow(/status 500/)
    })
  })

  describe('reverseGeocode', () => {
    it('should reverse geocode with lat/lon and limit 1', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ features: [createFeature()] })),
      )

      const results = await provider.reverseGeocode(47.1411, 9.5215)
      expect(results).toHaveLength(1)
      const url = new URL(lastFetchUrl())
      expect(url.pathname).toBe('/reverse')
      expect(url.searchParams.get('lat')).toBe('47.1411')
      expect(url.searchParams.get('lon')).toBe('9.5215')
      expect(url.searchParams.get('limit')).toBe('1')
    })

    it('should return an empty array when the point has no result', async () => {
      const results = await provider.reverseGeocode(0, 0)
      expect(results).toEqual([])
    })
  })

  describe('distance', () => {
    it('should compute the Haversine distance in km and mi', () => {
      const vaduz = { lat: 47.1411, lng: 9.5215 }
      const schaan = { lat: 47.1652, lng: 9.5093 }
      const km = provider.distance(vaduz, schaan)
      expect(km).toBeGreaterThan(2)
      expect(km).toBeLessThan(4)
      const mi = provider.distance(vaduz, schaan, 'mi')
      expect(mi).toBeGreaterThan(km * 0.6)
      expect(mi).toBeLessThan(km * 0.63)
    })
  })

  describe('autocomplete', () => {
    it('should map features to place suggestions with location bias', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ features: [createFeature()] })),
      )

      const p = createProvider({ baseUrl: 'https://photon.example.com' })
      const suggestions = await p.autocomplete('Peter-K', {
        location: { lat: 47.14, lng: 9.52 },
        radius: 50_000,
      })
      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].placeId).toBe('photon:w123456')
      expect(suggestions[0].mainText).toContain('Peter-Kaiser-Platz')
      expect(suggestions[0].secondaryText).toContain('Vaduz')
      expect(suggestions[0].location).toEqual({ lat: 47.1411, lng: 9.5215 })
      const url = new URL(lastFetchUrl())
      expect(url.searchParams.get('lat')).toBe('47.14')
      expect(url.searchParams.get('lon')).toBe('9.52')
      const zoom = Number(url.searchParams.get('zoom'))
      expect(zoom).toBeGreaterThanOrEqual(1)
      expect(zoom).toBeLessThanOrEqual(16)
    })
  })
})
