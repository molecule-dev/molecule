import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TravelProvider } from '@molecule/api-travel'

import { createProvider } from '../provider.js'
import {
  AmadeusTravelMissingCredentialsError,
  AmadeusTravelTokenMintError,
  AmadeusTravelUpstreamError,
  MISSING_CREDENTIALS,
  TOKEN_MINT_FAILED,
  UPSTREAM_ERROR,
} from '../types.js'

/** Builds a fake Response for `vi.stubGlobal('fetch', ...)`. */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(data),
  }) as unknown as Response

const TOKEN_FIXTURE = {
  access_token: 'fake-token-abc',
  expires_in: 1799,
  token_type: 'Bearer',
}

const FLIGHT_SEARCH_FIXTURE = {
  data: [
    {
      id: '1',
      itineraries: [
        {
          duration: 'PT7H30M',
          segments: [
            {
              departure: { iataCode: 'JFK', at: '2026-07-15T19:00:00', terminal: '4' },
              arrival: { iataCode: 'CDG', at: '2026-07-16T07:30:00', terminal: '2E' },
              carrierCode: 'AF',
              number: '23',
              duration: 'PT7H30M',
            },
          ],
        },
      ],
      price: { total: '542.50', grandTotal: '542.50', currency: 'USD' },
    },
  ],
}

const HOTEL_LOCATIONS_FIXTURE = {
  data: [
    { hotelId: 'PARHTL01', name: 'Hotel A' },
    { hotelId: 'PARHTL02', name: 'Hotel B' },
  ],
}

const HOTEL_OFFERS_FIXTURE = {
  data: [
    {
      hotel: { hotelId: 'PARHTL01', name: 'Hotel A', rating: '5' },
      offers: [
        {
          id: 'offer-A',
          checkInDate: '2026-07-15',
          checkOutDate: '2026-07-22',
          price: { total: '720.00', currency: 'EUR' },
          room: { description: { text: 'Deluxe King' } },
          policies: { cancellations: [] },
        },
      ],
    },
    {
      hotel: { hotelId: 'PARHTL02', name: 'Hotel B', rating: '4' },
      offers: [
        {
          id: 'offer-B',
          checkInDate: '2026-07-15',
          checkOutDate: '2026-07-22',
          price: { total: '480.00', currency: 'EUR' },
          policies: { cancellations: [{ numberOfNights: 1 }] },
        },
      ],
    },
  ],
}

const CITIES_FIXTURE = {
  data: [{ iataCode: 'PAR', geoCode: { latitude: 48.8566, longitude: 2.3522 } }],
}

const ACTIVITIES_FIXTURE = {
  data: [
    {
      id: 'activity-1',
      name: 'Eiffel Tower skip-the-line',
      shortDescription: 'Priority access',
      geoCode: { latitude: 48.8584, longitude: 2.2945 },
      pictures: ['https://example.test/eiffel.jpg'],
      bookingLink: 'https://example.test/book',
      minimumDuration: 'PT2H',
      price: { amount: '65.00', currencyCode: 'EUR' },
    },
    {
      id: 'activity-2',
      name: 'Louvre guided tour',
      description: '2-hour highlights tour',
      geoCode: { latitude: 48.8606, longitude: 2.3376 },
      price: { amount: '85.00', currencyCode: 'EUR' },
    },
  ],
}

describe('amadeus travel provider', () => {
  let provider: TravelProvider

  beforeEach(() => {
    provider = createProvider({ clientId: 'cid', clientSecret: 'csec' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.searchTripOptions).toBeInstanceOf(Function)
      expect(provider.searchActivities).toBeInstanceOf(Function)
      expect(provider.searchCars).toBeInstanceOf(Function)
    })

    it('registers its secret definitions at import time', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('AMADEUS_CLIENT_ID')).toBeDefined()
    })

    it('should default to the test sandbox base URL', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          return Promise.resolve(
            url.endsWith('/oauth2/token')
              ? mockFetchResponse(TOKEN_FIXTURE)
              : mockFetchResponse(FLIGHT_SEARCH_FIXTURE),
          )
        }),
      )

      await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
      })

      expect(calls[0]).toBe('https://test.api.amadeus.com/v1/security/oauth2/token')
      expect(calls[1].startsWith('https://test.api.amadeus.com/v2/shopping/flight-offers')).toBe(
        true,
      )
    })

    it('should use the production base URL when useProduction is true', async () => {
      const p = createProvider({ clientId: 'cid', clientSecret: 'csec', useProduction: true })
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          return Promise.resolve(
            url.endsWith('/oauth2/token')
              ? mockFetchResponse(TOKEN_FIXTURE)
              : mockFetchResponse(FLIGHT_SEARCH_FIXTURE),
          )
        }),
      )

      await p.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
      })

      expect(calls[0]).toBe('https://api.amadeus.com/v1/security/oauth2/token')
      expect(calls[1].startsWith('https://api.amadeus.com/')).toBe(true)
    })

    it('should respect a custom baseUrl override', async () => {
      const p = createProvider({
        clientId: 'cid',
        clientSecret: 'csec',
        useProduction: true,
        baseUrl: 'https://example.test',
      })
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          return Promise.resolve(
            url.endsWith('/oauth2/token')
              ? mockFetchResponse(TOKEN_FIXTURE)
              : mockFetchResponse(FLIGHT_SEARCH_FIXTURE),
          )
        }),
      )

      await p.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
      })

      expect(calls[0]).toBe('https://example.test/v1/security/oauth2/token')
    })
  })

  describe('credentials', () => {
    it('should throw a sanitized error when client id is missing', async () => {
      const noEnv = createProvider({ clientSecret: 'csec' })
      const restore = process.env['AMADEUS_CLIENT_ID']
      delete process.env['AMADEUS_CLIENT_ID']
      try {
        await expect(
          noEnv.searchTripOptions({
            origin: 'JFK',
            destination: 'CDG',
            departureDate: '2026-07-15',
            includeFlights: true,
            includeHotels: false,
          }),
        ).rejects.toBeInstanceOf(AmadeusTravelMissingCredentialsError)
      } finally {
        if (restore !== undefined) process.env['AMADEUS_CLIENT_ID'] = restore
      }
    })

    it('should throw a sanitized error when client secret is missing', async () => {
      const noEnv = createProvider({ clientId: 'cid' })
      const restore = process.env['AMADEUS_CLIENT_SECRET']
      delete process.env['AMADEUS_CLIENT_SECRET']
      try {
        let caught: unknown
        try {
          await noEnv.searchTripOptions({
            origin: 'JFK',
            destination: 'CDG',
            departureDate: '2026-07-15',
            includeFlights: true,
            includeHotels: false,
          })
        } catch (error) {
          caught = error
        }
        expect(caught).toBeInstanceOf(AmadeusTravelMissingCredentialsError)
        expect((caught as Error).message).not.toContain('csec')
        expect((caught as { code?: string }).code).toBe(MISSING_CREDENTIALS)
      } finally {
        if (restore !== undefined) process.env['AMADEUS_CLIENT_SECRET'] = restore
      }
    })

    it('should NOT include the client secret in token-mint errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(
              mockFetchResponse({ errors: [{ title: 'invalid_client' }] }, 401),
            )
          }
          return Promise.resolve(mockFetchResponse({}))
        }),
      )

      let caught: unknown
      try {
        await provider.searchTripOptions({
          origin: 'JFK',
          destination: 'CDG',
          departureDate: '2026-07-15',
          includeFlights: true,
          includeHotels: false,
        })
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(AmadeusTravelTokenMintError)
      expect((caught as Error).message).not.toContain('csec')
      expect((caught as { code?: string }).code).toBe(TOKEN_MINT_FAILED)
    })
  })

  describe('searchTripOptions', () => {
    it('should fetch flights and hotels in parallel and aggregate results', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v2/shopping/flight-offers')) {
            return Promise.resolve(mockFetchResponse(FLIGHT_SEARCH_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/hotels/by-city')) {
            return Promise.resolve(mockFetchResponse(HOTEL_LOCATIONS_FIXTURE))
          }
          if (url.includes('/v3/shopping/hotel-offers')) {
            return Promise.resolve(mockFetchResponse(HOTEL_OFFERS_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        travelers: { adults: 2, children: 1 },
        includeFlights: true,
        includeHotels: true,
      })

      expect(result.flights).toHaveLength(1)
      expect(result.flights[0].id).toBe('1')
      expect(result.flights[0].price.total).toBe(542.5)
      expect(result.flights[0].duration).toBe('PT7H30M')
      expect(result.hotels).toHaveLength(2)
      expect(result.hotels[0].id).toBe('offer-A')
      expect(result.hotels[0].name).toBe('Hotel A')
      expect(result.hotels[0].rating).toBe(5)
      expect(result.hotels[0].refundable).toBe(true)
      expect(result.hotels[1].refundable).toBe(false)
      expect(result.cars).toEqual([])
      expect(result.activities).toEqual([])
      expect(calls.some((c) => c.includes('adults=2'))).toBe(true)
      expect(calls.some((c) => c.includes('children=1'))).toBe(true)
    })

    it('should default to one adult when travelers are omitted', async () => {
      const flightUrls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/v2/shopping/flight-offers')) {
            flightUrls.push(url)
            return Promise.resolve(mockFetchResponse(FLIGHT_SEARCH_FIXTURE))
          }
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
      })

      expect(flightUrls[0]).toContain('adults=1')
      expect(flightUrls[0]).not.toContain('children=')
      expect(flightUrls[0]).not.toContain('infants=')
    })

    it('should skip flights when includeFlights is false', async () => {
      const seen: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          seen.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/hotels/by-city')) {
            return Promise.resolve(mockFetchResponse(HOTEL_LOCATIONS_FIXTURE))
          }
          if (url.includes('/v3/shopping/hotel-offers')) {
            return Promise.resolve(mockFetchResponse(HOTEL_OFFERS_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        includeFlights: false,
        includeHotels: true,
      })

      expect(seen.some((u) => u.includes('/v2/shopping/flight-offers'))).toBe(false)
      expect(result.flights).toEqual([])
      expect(result.hotels.length).toBeGreaterThan(0)
    })

    it('should skip hotels when returnDate is missing', async () => {
      const seen: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          seen.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse(FLIGHT_SEARCH_FIXTURE))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: true,
      })

      expect(seen.some((u) => u.includes('/v1/reference-data/locations/hotels'))).toBe(false)
      expect(seen.some((u) => u.includes('/v3/shopping/hotel-offers'))).toBe(false)
      expect(result.hotels).toEqual([])
    })

    it('should always return cars as an empty array', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse(FLIGHT_SEARCH_FIXTURE))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
        includeCars: true,
      })

      expect(result.cars).toEqual([])
    })

    it('should include activities when includeActivities is true', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/cities')) {
            return Promise.resolve(mockFetchResponse(CITIES_FIXTURE))
          }
          if (url.includes('/v1/shopping/activities')) {
            return Promise.resolve(mockFetchResponse(ACTIVITIES_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        includeFlights: false,
        includeHotels: false,
        includeActivities: true,
      })

      expect(result.activities).toHaveLength(2)
      expect(result.activities[0].id).toBe('activity-1')
      expect(result.activities[0].location?.lat).toBeCloseTo(48.8584)
      expect(result.activities[0].pictureUrl).toBe('https://example.test/eiffel.jpg')
      expect(calls.some((u) => u.includes('latitude=48.8566'))).toBe(true)
    })

    it('should swallow per-batch hotel-offer errors and surface partial results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/hotels/by-city')) {
            return Promise.resolve(mockFetchResponse(HOTEL_LOCATIONS_FIXTURE))
          }
          if (url.includes('/v3/shopping/hotel-offers')) {
            return Promise.resolve(mockFetchResponse({ errors: [{ title: 'no-availability' }] }))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'PAR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        includeFlights: false,
        includeHotels: true,
      })

      expect(result.hotels).toEqual([])
    })

    it('should propagate flight-search upstream errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ errors: [{ title: 'bad' }] }, 502))
        }),
      )

      let caught: unknown
      try {
        await provider.searchTripOptions({
          origin: 'JFK',
          destination: 'CDG',
          departureDate: '2026-07-15',
          includeFlights: true,
          includeHotels: false,
        })
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(AmadeusTravelUpstreamError)
      expect((caught as { code?: string }).code).toBe(UPSTREAM_ERROR)
      expect((caught as Error).message).not.toContain('csec')
    })
  })

  describe('searchActivities', () => {
    it('should accept a string destination and resolve via cities lookup', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/cities')) {
            return Promise.resolve(mockFetchResponse(CITIES_FIXTURE))
          }
          if (url.includes('/v1/shopping/activities')) {
            return Promise.resolve(mockFetchResponse(ACTIVITIES_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchActivities({ destination: 'PAR' })

      expect(result).toHaveLength(2)
      expect(calls.some((u) => u.includes('keyword=PAR'))).toBe(true)
    })

    it('should accept a geo destination and skip the cities lookup', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/shopping/activities')) {
            return Promise.resolve(mockFetchResponse(ACTIVITIES_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchActivities({
        destination: { lat: 48.8566, lon: 2.3522 },
        maxResults: 1,
      })

      expect(result).toHaveLength(1)
      expect(calls.some((u) => u.includes('/v1/reference-data/locations/cities'))).toBe(false)
      expect(calls.some((u) => u.includes('latitude=48.8566'))).toBe(true)
    })

    it('should return an empty array when the city lookup yields no geo', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v1/reference-data/locations/cities')) {
            return Promise.resolve(mockFetchResponse({ data: [] }))
          }
          return Promise.resolve(mockFetchResponse({ data: [] }))
        }),
      )

      const result = await provider.searchActivities({ destination: 'XXX' })
      expect(result).toEqual([])
    })
  })

  describe('searchCars', () => {
    it('should always return an empty array (Amadeus has no public cars API)', async () => {
      // No fetch mock — the method must NOT issue any HTTP calls.
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)

      const result = await provider.searchCars({
        pickupLocation: 'CDG',
        pickupDate: '2026-07-15',
        returnDate: '2026-07-22',
      })

      expect(result).toEqual([])
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('token caching', () => {
    it('should mint the token once across multiple calls', async () => {
      let tokenCalls = 0
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            tokenCalls += 1
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse(FLIGHT_SEARCH_FIXTURE))
        }),
      )

      await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-15',
        includeFlights: true,
        includeHotels: false,
      })
      await provider.searchTripOptions({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-16',
        includeFlights: true,
        includeHotels: false,
      })

      expect(tokenCalls).toBe(1)
    })
  })
})
