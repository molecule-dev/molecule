import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FlightsProvider } from '@molecule/api-flights'

import { createProvider } from '../provider.js'
import {
  AmadeusMissingCredentialsError,
  AmadeusRateLimitedError,
  AmadeusUnknownOfferError,
  AmadeusUpstreamError,
  MISSING_CREDENTIALS,
  RATE_LIMITED,
  UNKNOWN_OFFER,
  UPSTREAM_ERROR,
} from '../types.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 *
 * @param data - JSON body the response should resolve to.
 * @param status - HTTP status. Defaults to `200`.
 * @param headers - Response headers (lower-cased keys).
 * @returns A minimal `Response` stub.
 */
const mockFetchResponse = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string): string | null => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(data),
  }) as unknown as Response

const TOKEN_FIXTURE = {
  access_token: 'fake-token-abc',
  expires_in: 1799,
  token_type: 'Bearer',
}

const SEARCH_FIXTURE = {
  data: [
    {
      type: 'flight-offer',
      id: '1',
      itineraries: [
        {
          duration: 'PT7H30M',
          segments: [
            {
              departure: { iataCode: 'JFK', at: '2026-07-15T19:00:00', terminal: '4' },
              arrival: { iataCode: 'LHR', at: '2026-07-16T07:30:00', terminal: '3' },
              carrierCode: 'BA',
              number: '178',
              aircraft: { code: '777' },
              duration: 'PT7H30M',
            },
          ],
        },
      ],
      price: { total: '542.50', grandTotal: '542.50', currency: 'USD' },
      travelerPricings: [
        {
          travelerId: '1',
          travelerType: 'ADULT',
          price: { total: '542.50', currency: 'USD' },
          fareDetailsBySegment: [{ segmentId: '1', cabin: 'ECONOMY' }],
        },
      ],
    },
    {
      type: 'flight-offer',
      id: '2',
      itineraries: [
        {
          duration: 'PT9H45M',
          segments: [
            {
              departure: { iataCode: 'JFK', at: '2026-07-15T20:00:00' },
              arrival: { iataCode: 'CDG', at: '2026-07-16T09:00:00' },
              carrierCode: 'AF',
              number: '23',
            },
            {
              departure: { iataCode: 'CDG', at: '2026-07-16T11:30:00' },
              arrival: { iataCode: 'LHR', at: '2026-07-16T11:45:00' },
              carrierCode: 'AF',
              number: '1380',
            },
          ],
        },
      ],
      price: { total: '480.10', currency: 'USD' },
    },
  ],
}

const PRICING_FIXTURE = {
  data: {
    type: 'flight-offers-pricing',
    flightOffers: [
      {
        type: 'flight-offer',
        id: '1',
        itineraries: SEARCH_FIXTURE.data[0].itineraries,
        price: { total: '558.00', grandTotal: '558.00', currency: 'USD' },
        travelerPricings: [
          {
            travelerId: '1',
            travelerType: 'ADULT',
            price: { total: '558.00', currency: 'USD' },
            fareDetailsBySegment: [{ segmentId: '1', cabin: 'ECONOMY' }],
          },
        ],
      },
    ],
  },
}

describe('amadeus flights provider', () => {
  let provider: FlightsProvider

  beforeEach(() => {
    provider = createProvider({ clientId: 'cid', clientSecret: 'csec' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.searchFlights).toBeInstanceOf(Function)
      expect(provider.getOffer).toBeInstanceOf(Function)
      expect(provider.priceOffer).toBeInstanceOf(Function)
    })

    it('should default to the test sandbox base URL', async () => {
      const calls: string[] = []
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        calls.push(url)
        return Promise.resolve(
          url.endsWith('/oauth2/token')
            ? mockFetchResponse(TOKEN_FIXTURE)
            : mockFetchResponse(SEARCH_FIXTURE),
        )
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
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
              : mockFetchResponse(SEARCH_FIXTURE),
          )
        }),
      )

      await p.searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })

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
              : mockFetchResponse(SEARCH_FIXTURE),
          )
        }),
      )

      await p.searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })

      expect(calls[0]).toBe('https://example.test/v1/security/oauth2/token')
      expect(calls[1].startsWith('https://example.test/')).toBe(true)
    })
  })

  describe('credential handling', () => {
    it('should throw AmadeusMissingCredentialsError when neither clientId nor clientSecret is set', async () => {
      const p = createProvider({})
      const error = await p
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )
      expect(error).toBeInstanceOf(AmadeusMissingCredentialsError)
      expect((error as AmadeusMissingCredentialsError).code).toBe(MISSING_CREDENTIALS)
    })

    it('should throw AmadeusMissingCredentialsError when only clientId is set', async () => {
      const p = createProvider({ clientId: 'cid' })
      const error = await p
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )
      expect(error).toBeInstanceOf(AmadeusMissingCredentialsError)
    })
  })

  describe('OAuth token caching', () => {
    it('should fetch the token once and reuse it across calls', async () => {
      let tokenCalls = 0
      let searchCalls = 0
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/oauth2/token')) {
          tokenCalls += 1
          return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
        }
        searchCalls += 1
        return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })
      await provider.searchFlights({
        origin: 'JFK',
        destination: 'CDG',
        departureDate: '2026-07-16',
      })

      expect(tokenCalls).toBe(1)
      expect(searchCalls).toBe(2)
    })

    it('should send client_credentials and include both id and secret in the OAuth body', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, init: { body?: string }) => {
        if (url.endsWith('/oauth2/token')) {
          expect(init.body).toContain('grant_type=client_credentials')
          expect(init.body).toContain('client_id=cid')
          expect(init.body).toContain('client_secret=csec')
          return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
        }
        return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
      })
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })

      expect.assertions(3)
    })

    it('should send the bearer token on subsequent API calls', async () => {
      const mockFetch = vi
        .fn()
        .mockImplementation((url: string, init: { headers: Record<string, string> }) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          expect(init.headers.Authorization).toBe('Bearer fake-token-abc')
          return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
        })
      vi.stubGlobal('fetch', mockFetch)

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })

      expect.assertions(1)
    })
  })

  describe('searchFlights', () => {
    it('should map the Amadeus response into normalized FlightOffer rows', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation((url: string) =>
            Promise.resolve(
              url.endsWith('/oauth2/token')
                ? mockFetchResponse(TOKEN_FIXTURE)
                : mockFetchResponse(SEARCH_FIXTURE),
            ),
          ),
      )

      const offers = await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })

      expect(offers).toHaveLength(2)
      const first = offers[0]
      expect(first.id).toBe('1')
      expect(first.price).toBe(542.5)
      expect(first.currency).toBe('USD')
      expect(first.duration).toBe('PT7H30M')
      expect(first.segments).toHaveLength(1)
      expect(first.segments[0].carrier).toBe('BA')
      expect(first.segments[0].flightNumber).toBe('178')
      expect(first.segments[0].departure.airport).toBe('JFK')
      expect(first.segments[0].departure.terminal).toBe('4')
      expect(first.segments[0].aircraft).toBe('777')

      const second = offers[1]
      expect(second.segments).toHaveLength(2)
      expect(second.segments[0].departure.terminal).toBeNull()
      expect(second.duration).toBe('PT9H45M')
    })

    it('should pass searchFlights options through as query parameters', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          return Promise.resolve(
            url.endsWith('/oauth2/token')
              ? mockFetchResponse(TOKEN_FIXTURE)
              : mockFetchResponse(SEARCH_FIXTURE),
          )
        }),
      )

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
        returnDate: '2026-07-22',
        adults: 2,
        children: 1,
        infants: 1,
        cabin: 'business',
        maxResults: 5,
      })

      const calledUrl = calls[1]
      expect(calledUrl).toContain('originLocationCode=JFK')
      expect(calledUrl).toContain('destinationLocationCode=LHR')
      expect(calledUrl).toContain('departureDate=2026-07-15')
      expect(calledUrl).toContain('returnDate=2026-07-22')
      expect(calledUrl).toContain('adults=2')
      expect(calledUrl).toContain('children=1')
      expect(calledUrl).toContain('infants=1')
      expect(calledUrl).toContain('travelClass=BUSINESS')
      expect(calledUrl).toContain('max=5')
    })

    it('should default cabin to ECONOMY and adults to 1 when omitted', async () => {
      const calls: string[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url)
          return Promise.resolve(
            url.endsWith('/oauth2/token')
              ? mockFetchResponse(TOKEN_FIXTURE)
              : mockFetchResponse(SEARCH_FIXTURE),
          )
        }),
      )

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })

      const calledUrl = calls[1]
      expect(calledUrl).toContain('travelClass=ECONOMY')
      expect(calledUrl).toContain('adults=1')
      expect(calledUrl).not.toContain('children=')
      expect(calledUrl).not.toContain('infants=')
    })
  })

  describe('priceOffer', () => {
    it('should throw AmadeusUnknownOfferError when the offer was not searched first', async () => {
      const error = await provider.priceOffer('does-not-exist').then(
        () => null,
        (err: unknown) => err,
      )
      expect(error).toBeInstanceOf(AmadeusUnknownOfferError)
      expect((error as AmadeusUnknownOfferError).code).toBe(UNKNOWN_OFFER)
      expect((error as AmadeusUnknownOfferError).offerId).toBe('does-not-exist')
    })

    it('should price a previously-searched offer and return a normalized PricingResult', async () => {
      const calls: Array<{ url: string; init: { method: string; body?: string } }> = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string, init: { method: string; body?: string }) => {
          calls.push({ url, init })
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v2/shopping/flight-offers')) {
            return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
          }
          if (url.endsWith('/v1/shopping/flight-offers/pricing')) {
            return Promise.resolve(mockFetchResponse(PRICING_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({}))
        }),
      )

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })
      const result = await provider.priceOffer('1')

      expect(result.offerId).toBe('1')
      expect(result.price).toBe(558)
      expect(result.currency).toBe('USD')
      expect(result.travelerPricings).toHaveLength(1)
      expect(result.travelerPricings![0].travelerType).toBe('adult')
      expect(result.travelerPricings![0].cabin).toBe('economy')
      expect(result.pricedAt).toBeInstanceOf(Date)

      const pricingCall = calls.find((c) => c.url.endsWith('/v1/shopping/flight-offers/pricing'))!
      expect(pricingCall.init.method).toBe('POST')
      const body = JSON.parse(pricingCall.init.body!)
      expect(body.data.type).toBe('flight-offers-pricing')
      expect(body.data.flightOffers).toHaveLength(1)
      expect(body.data.flightOffers[0].id).toBe('1')
    })
  })

  describe('getOffer', () => {
    it('should throw AmadeusUnknownOfferError when the offer was not searched first', async () => {
      const error = await provider.getOffer('does-not-exist').then(
        () => null,
        (err: unknown) => err,
      )
      expect(error).toBeInstanceOf(AmadeusUnknownOfferError)
    })

    it('should round-trip via the pricing endpoint and return FlightOfferDetail', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v2/shopping/flight-offers')) {
            return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
          }
          if (url.endsWith('/v1/shopping/flight-offers/pricing')) {
            return Promise.resolve(mockFetchResponse(PRICING_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({}))
        }),
      )

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })
      const detail = await provider.getOffer('1')

      expect(detail.id).toBe('1')
      expect(detail.price).toBe(558)
      expect(detail.travelerPricings).toHaveLength(1)
      expect(detail.travelerPricings![0].cabin).toBe('economy')
      expect(detail.segments).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('should throw AmadeusRateLimitedError on token-endpoint HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '15' })),
      )

      const error = await provider
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(AmadeusRateLimitedError)
      expect((error as AmadeusRateLimitedError).code).toBe(RATE_LIMITED)
      expect((error as AmadeusRateLimitedError).retryAfterSeconds).toBe(15)
    })

    it('should throw AmadeusRateLimitedError on search HTTP 429', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({}, 429))
        }),
      )

      const error = await provider
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(AmadeusRateLimitedError)
      expect((error as AmadeusRateLimitedError).retryAfterSeconds).toBeNull()
    })

    it('should throw AmadeusUpstreamError on other HTTP errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse({}, 500))
        }),
      )

      const error = await provider
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(AmadeusUpstreamError)
      expect((error as AmadeusUpstreamError).code).toBe(UPSTREAM_ERROR)
      expect((error as AmadeusUpstreamError).status).toBe(500)
    })

    it('should not include the client id or secret in error messages', async () => {
      const p = createProvider({ clientId: 'super-cid', clientSecret: 'super-secret-key' })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 500)))

      const error = await p
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain('super-secret-key')
      expect((error as Error).message).not.toContain('super-cid')
    })

    it('should not include the client secret in rate-limited error messages', async () => {
      const p = createProvider({ clientId: 'super-cid', clientSecret: 'super-secret-key' })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': '5' })),
      )

      const error = await p
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(AmadeusRateLimitedError)
      expect((error as Error).message).not.toContain('super-secret-key')
      expect((error as Error).message).not.toContain('super-cid')
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ clientId: 'cid', clientSecret: 'csec', timeout: 25 })
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

      await expect(
        p.searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' }),
      ).rejects.toThrow()
    })

    it('should accept an HTTP-date Retry-After header', async () => {
      const future = new Date(Date.now() + 30_000).toUTCString()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({}, 429, { 'retry-after': future })),
      )

      const error = await provider
        .searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
        .then(
          () => null,
          (err: unknown) => err,
        )

      expect(error).toBeInstanceOf(AmadeusRateLimitedError)
      const seconds = (error as AmadeusRateLimitedError).retryAfterSeconds
      expect(seconds).not.toBeNull()
      expect(seconds!).toBeGreaterThan(0)
      expect(seconds!).toBeLessThanOrEqual(31)
    })
  })

  describe('mapping edge cases', () => {
    it('should preserve null aircraft and null terminal when absent', async () => {
      const fixture = {
        data: [
          {
            type: 'flight-offer',
            id: '99',
            itineraries: [
              {
                segments: [
                  {
                    departure: { iataCode: 'SFO', at: '2026-07-15T08:00:00' },
                    arrival: { iataCode: 'LAX', at: '2026-07-15T09:30:00' },
                    carrierCode: 'AS',
                    number: '550',
                  },
                ],
              },
            ],
            price: { total: '120.00', currency: 'USD' },
          },
        ],
      }
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation((url: string) =>
            Promise.resolve(
              url.endsWith('/oauth2/token')
                ? mockFetchResponse(TOKEN_FIXTURE)
                : mockFetchResponse(fixture),
            ),
          ),
      )

      const offers = await provider.searchFlights({
        origin: 'SFO',
        destination: 'LAX',
        departureDate: '2026-07-15',
      })

      expect(offers[0].segments[0].aircraft).toBeNull()
      expect(offers[0].segments[0].departure.terminal).toBeNull()
      expect(offers[0].duration).toBe('PT0M')
    })

    it('should leave traveler cabin null when cabins differ across segments', async () => {
      const fixture = {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [
            {
              type: 'flight-offer',
              id: '1',
              itineraries: SEARCH_FIXTURE.data[0].itineraries,
              price: { total: '600.00', currency: 'USD' },
              travelerPricings: [
                {
                  travelerId: '1',
                  travelerType: 'ADULT',
                  price: { total: '600.00', currency: 'USD' },
                  fareDetailsBySegment: [
                    { segmentId: '1', cabin: 'ECONOMY' },
                    { segmentId: '2', cabin: 'BUSINESS' },
                  ],
                },
              ],
            },
          ],
        },
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          if (url.includes('/v2/shopping/flight-offers')) {
            return Promise.resolve(mockFetchResponse(SEARCH_FIXTURE))
          }
          return Promise.resolve(mockFetchResponse(fixture))
        }),
      )

      await provider.searchFlights({
        origin: 'JFK',
        destination: 'LHR',
        departureDate: '2026-07-15',
      })
      const result = await provider.priceOffer('1')

      expect(result.travelerPricings![0].cabin).toBeNull()
    })

    it('should evict the oldest entry when the cache exceeds capacity', async () => {
      const p = createProvider({
        clientId: 'cid',
        clientSecret: 'csec',
        offerCacheSize: 1,
      })
      const firstSearch = {
        data: [
          {
            type: 'flight-offer',
            id: 'A',
            itineraries: [{ segments: SEARCH_FIXTURE.data[0].itineraries[0].segments }],
            price: { total: '100', currency: 'USD' },
          },
        ],
      }
      const secondSearch = {
        data: [
          {
            type: 'flight-offer',
            id: 'B',
            itineraries: [{ segments: SEARCH_FIXTURE.data[0].itineraries[0].segments }],
            price: { total: '200', currency: 'USD' },
          },
        ],
      }
      let searchN = 0
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.endsWith('/oauth2/token')) {
            return Promise.resolve(mockFetchResponse(TOKEN_FIXTURE))
          }
          searchN += 1
          return Promise.resolve(mockFetchResponse(searchN === 1 ? firstSearch : secondSearch))
        }),
      )

      await p.searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-15' })
      await p.searchFlights({ origin: 'JFK', destination: 'LHR', departureDate: '2026-07-16' })

      const error = await p.priceOffer('A').then(
        () => null,
        (err: unknown) => err,
      )
      expect(error).toBeInstanceOf(AmadeusUnknownOfferError)
    })
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('AMADEUS_CLIENT_ID')).toBeDefined()
  })
})
