import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HotelsProvider } from '@molecule/api-hotels'

import { createProvider, sanitizeErrorMessage } from '../provider.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/** Realistic Amadeus OAuth2 token response. */
const tokenFixture = {
  access_token: 'test-access-token',
  expires_in: 1799,
  token_type: 'Bearer',
}

/** Realistic `/v1/reference-data/locations/hotels/by-city` payload. */
const byCityFixture = {
  data: [
    {
      hotelId: 'MCLONGHM',
      name: 'Hotel de Paris',
      iataCode: 'PAR',
      rating: '5',
      geoCode: { latitude: 48.8566, longitude: 2.3522 },
      address: {
        countryCode: 'FR',
        cityName: 'Paris',
        lines: ['1 Rue de Castiglione'],
        postalCode: '75001',
      },
      distance: { value: 0.4, unit: 'KM' },
    },
    {
      hotelId: 'BWLONLON',
      name: 'Best Western Paris',
      iataCode: 'PAR',
      rating: '4',
      geoCode: { latitude: 48.86, longitude: 2.35 },
    },
  ],
}

/** Realistic `/v3/shopping/hotel-offers` payload covering both hotels. */
const hotelOffersBatchFixture = {
  data: [
    {
      hotel: {
        hotelId: 'MCLONGHM',
        name: 'Hotel de Paris',
        cityCode: 'PAR',
      },
      offers: [
        {
          id: 'OFFER-MC-DELUXE',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          rateCode: 'BAR',
          guests: { adults: 2 },
          room: { description: { text: 'Deluxe King Room' } },
          price: { total: '720.00', currency: 'EUR' },
          policies: { cancellations: [{ type: 'CANCELLATION', numberOfNights: 1 }] },
        },
        {
          id: 'OFFER-MC-BASIC',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          rateCode: 'AAA',
          guests: { adults: 2 },
          room: { description: { text: 'Standard Queen Room' } },
          price: { total: '480.00', currency: 'EUR' },
          policies: { cancellations: [] },
        },
      ],
    },
    {
      hotel: {
        hotelId: 'BWLONLON',
        name: 'Best Western Paris',
        cityCode: 'PAR',
      },
      offers: [
        {
          id: 'OFFER-BW-1',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          guests: { adults: 2 },
          room: { description: { text: 'Standard Double' } },
          price: { total: '320.00', currency: 'EUR' },
        },
      ],
    },
  ],
}

/** Realistic `/v3/shopping/hotel-offers` payload for one hotel only. */
const oneHotelOffersFixture = {
  data: [
    {
      hotel: { hotelId: 'MCLONGHM', name: 'Hotel de Paris', cityCode: 'PAR' },
      offers: [
        {
          id: 'OFFER-MC-DELUXE',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          rateCode: 'BAR',
          guests: { adults: 2 },
          room: { description: { text: 'Deluxe King Room' } },
          price: { total: '720.00', currency: 'EUR' },
          policies: { cancellations: [] },
        },
      ],
    },
  ],
}

/**
 * Sets up a fetch mock that responds to the token mint and one or more
 * data calls in order.
 */
const stubAmadeus = (
  responses: Array<{ data?: unknown; status?: number }>,
): ReturnType<typeof vi.fn> => {
  const mock = vi.fn()
  // First call is always the token mint.
  mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
  for (const r of responses) {
    mock.mockResolvedValueOnce(mockFetchResponse(r.data, r.status))
  }
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('amadeus hotels provider', () => {
  let provider: HotelsProvider

  beforeEach(() => {
    provider = createProvider({ clientId: 'test-id', clientSecret: 'test-secret' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should expose the HotelsProvider methods', () => {
      expect(provider.searchHotels).toBeInstanceOf(Function)
      expect(provider.getHotelOffers).toBeInstanceOf(Function)
      expect(provider.bookHotel).toBeInstanceOf(Function)
    })
  })

  describe('sanitizeErrorMessage', () => {
    it('should pass through plain detail strings unchanged', () => {
      expect(sanitizeErrorMessage('Invalid hotel id')).toBe('Invalid hotel id')
    })
  })

  describe('searchHotels', () => {
    it('should mint a token and search by cityCode, enriching with offers', async () => {
      const mock = stubAmadeus([{ data: byCityFixture }, { data: hotelOffersBatchFixture }])

      const results = await provider.searchHotels({
        cityCode: 'PAR',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
        rooms: 1,
      })

      // Token mint
      expect(mock.mock.calls[0][0]).toBe('https://api.amadeus.com/v1/security/oauth2/token')
      const tokenInit = mock.mock.calls[0][1] as { method?: string; body?: string }
      expect(tokenInit.method).toBe('POST')
      expect(tokenInit.body).toContain('grant_type=client_credentials')
      expect(tokenInit.body).toContain('client_id=test-id')
      expect(tokenInit.body).toContain('client_secret=test-secret')

      // Reference-data search
      const byCityUrl = mock.mock.calls[1][0] as string
      expect(byCityUrl).toContain('/v1/reference-data/locations/hotels/by-city')
      expect(byCityUrl).toContain('cityCode=PAR')
      const dataInit = mock.mock.calls[1][1] as { headers: Record<string, string> }
      expect(dataInit.headers.Authorization).toBe('Bearer test-access-token')

      // Offers enrichment
      const offersUrl = mock.mock.calls[2][0] as string
      expect(offersUrl).toContain('/v3/shopping/hotel-offers')
      expect(offersUrl).toContain('hotelIds=MCLONGHM%2CBWLONLON')
      expect(offersUrl).toContain('adults=2')
      expect(offersUrl).toContain('roomQuantity=1')

      // Results
      expect(results).toHaveLength(2)
      const mc = results[0]
      expect(mc.hotelId).toBe('MCLONGHM')
      expect(mc.name).toBe('Hotel de Paris')
      expect(mc.cityCode).toBe('PAR')
      expect(mc.rating).toBe(5)
      expect(mc.latitude).toBe(48.8566)
      expect(mc.longitude).toBe(2.3522)
      expect(mc.address?.countryCode).toBe('FR')
      expect(mc.address?.cityName).toBe('Paris')
      expect(mc.address?.line).toBe('1 Rue de Castiglione')
      expect(mc.distance).toBe(0.4)
      // fromPrice picks the cheapest offer (480 EUR, not 720)
      expect(mc.fromPrice).toEqual({ total: 480, currency: 'EUR' })

      const bw = results[1]
      expect(bw.fromPrice).toEqual({ total: 320, currency: 'EUR' })
    })

    it('should search by geo location when location is provided', async () => {
      const mock = stubAmadeus([
        {
          data: {
            data: [
              {
                hotelId: 'MCLONGHM',
                name: 'Hotel de Paris',
                geoCode: { latitude: 48.8566, longitude: 2.3522 },
              },
            ],
          },
        },
        { data: { data: [] } },
      ])

      await provider.searchHotels({
        location: { lat: 48.8566, lon: 2.3522, radius: 5 },
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
      })

      const url = mock.mock.calls[1][0] as string
      expect(url).toContain('/v1/reference-data/locations/hotels/by-geocode')
      expect(url).toContain('latitude=48.8566')
      expect(url).toContain('longitude=2.3522')
      expect(url).toContain('radius=5')
    })

    it('should pass through ratings filter', async () => {
      const mock = stubAmadeus([{ data: { data: [] } }])

      await provider.searchHotels({
        cityCode: 'PAR',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        ratings: [4, 5],
      })

      const url = mock.mock.calls[1][0] as string
      expect(url).toContain('ratings=4%2C5')
    })

    it('should reject non-ISO date strings', async () => {
      let caught: Error | undefined
      try {
        await provider.searchHotels({
          cityCode: 'PAR',
          checkInDate: '2026-6-1',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('ISO YYYY-MM-DD')
    })

    it('should reject when neither cityCode nor location is supplied', async () => {
      let caught: Error | undefined
      try {
        await provider.searchHotels({
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('cityCode or location')
    })

    it('should return bare hits when offers enrichment fails (non-fatal)', async () => {
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
      mock.mockResolvedValueOnce(mockFetchResponse(byCityFixture))
      mock.mockResolvedValueOnce(mockFetchResponse({}, 503))
      vi.stubGlobal('fetch', mock)

      const results = await provider.searchHotels({
        cityCode: 'PAR',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
      })

      expect(results).toHaveLength(2)
      expect(results[0].fromPrice).toBeUndefined()
    })

    it('should return [] when reference-data is empty (no offers call)', async () => {
      const mock = stubAmadeus([{ data: { data: [] } }])

      const results = await provider.searchHotels({
        cityCode: 'XYZ',
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
      })

      expect(results).toEqual([])
      // Only token + by-city were called; no offers call.
      expect(mock).toHaveBeenCalledTimes(2)
    })
  })

  describe('getHotelOffers', () => {
    it('should fetch and map priced offers for a single hotel', async () => {
      const mock = stubAmadeus([{ data: oneHotelOffersFixture }])

      const offers = await provider.getHotelOffers('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
      })

      const url = mock.mock.calls[1][0] as string
      expect(url).toContain('/v3/shopping/hotel-offers')
      expect(url).toContain('hotelIds=MCLONGHM')
      expect(url).toContain('checkInDate=2026-06-01')
      expect(url).toContain('checkOutDate=2026-06-04')
      expect(url).toContain('adults=2')

      expect(offers).toHaveLength(1)
      expect(offers[0]).toMatchObject({
        offerId: 'OFFER-MC-DELUXE',
        hotelId: 'MCLONGHM',
        price: { total: 720, currency: 'EUR' },
        roomDescription: 'Deluxe King Room',
        rateCode: 'BAR',
        adults: 2,
      })
      // Empty cancellations array → refundable
      expect(offers[0].refundable).toBe(true)
    })

    it('should mark offers with cancellation penalties as non-refundable', async () => {
      stubAmadeus([{ data: hotelOffersBatchFixture }])

      const offers = await provider.getHotelOffers('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
        adults: 2,
      })

      const deluxe = offers.find((o) => o.offerId === 'OFFER-MC-DELUXE')
      const basic = offers.find((o) => o.offerId === 'OFFER-MC-BASIC')
      expect(deluxe?.refundable).toBe(false)
      expect(basic?.refundable).toBe(true)
    })

    it('should reject non-ISO dates', async () => {
      let caught: Error | undefined
      try {
        await provider.getHotelOffers('MCLONGHM', {
          checkInDate: '06/01/2026',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('ISO YYYY-MM-DD')
    })

    it('should surface upstream errors[] with UPSTREAM_ERROR cause', async () => {
      stubAmadeus([
        {
          data: {
            errors: [
              {
                code: 1234,
                title: 'INVALID DATE',
                detail: 'Check-in must be in the future',
              },
            ],
          },
        },
      ])

      let caught: Error | undefined
      try {
        await provider.getHotelOffers('MCLONGHM', {
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('Check-in must be in the future')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should surface non-2xx HTTP errors with UPSTREAM_ERROR cause', async () => {
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
      mock.mockResolvedValueOnce(mockFetchResponse({ errors: [{ detail: 'Service down' }] }, 503))
      vi.stubGlobal('fetch', mock)

      let caught: Error | undefined
      try {
        await provider.getHotelOffers('MCLONGHM', {
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('status 503')
      expect(caught?.message).toContain('Service down')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('UPSTREAM_ERROR')
    })

    it('should return [] when data is missing', async () => {
      stubAmadeus([{ data: {} }])

      const offers = await provider.getHotelOffers('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-04',
      })

      expect(offers).toEqual([])
    })
  })

  describe('bookHotel', () => {
    it('should always throw BOOKING_NOT_SUPPORTED', async () => {
      let caught: Error | undefined
      try {
        await provider.bookHotel('OFFER-MC-DELUXE', {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught?.message).toContain('does not support direct booking')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('BOOKING_NOT_SUPPORTED')
    })

    it('should not invoke fetch (booking path is purely local)', async () => {
      const mock = vi.fn()
      vi.stubGlobal('fetch', mock)

      await expect(
        provider.bookHotel('OFFER-MC-DELUXE', {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        }),
      ).rejects.toThrow()

      expect(mock).not.toHaveBeenCalled()
    })
  })

  describe('credentials', () => {
    it('should throw MISSING_CREDENTIALS when no clientId is configured', async () => {
      const originalId = process.env['AMADEUS_CLIENT_ID']
      const originalSecret = process.env['AMADEUS_CLIENT_SECRET']
      delete process.env['AMADEUS_CLIENT_ID']
      process.env['AMADEUS_CLIENT_SECRET'] = 'whatever'
      try {
        const p = createProvider()
        let caught: Error | undefined
        try {
          await p.searchHotels({
            cityCode: 'PAR',
            checkInDate: '2026-06-01',
            checkOutDate: '2026-06-04',
          })
        } catch (error) {
          caught = error as Error
        }
        expect(caught?.message).toContain('credentials not configured')
        const cause = caught?.cause as { code?: string } | undefined
        expect(cause?.code).toBe('MISSING_CREDENTIALS')
      } finally {
        if (originalId !== undefined) process.env['AMADEUS_CLIENT_ID'] = originalId
        if (originalSecret !== undefined) {
          process.env['AMADEUS_CLIENT_SECRET'] = originalSecret
        } else {
          delete process.env['AMADEUS_CLIENT_SECRET']
        }
      }
    })

    it('should throw MISSING_CREDENTIALS when no clientSecret is configured', async () => {
      const originalId = process.env['AMADEUS_CLIENT_ID']
      const originalSecret = process.env['AMADEUS_CLIENT_SECRET']
      process.env['AMADEUS_CLIENT_ID'] = 'whatever'
      delete process.env['AMADEUS_CLIENT_SECRET']
      try {
        const p = createProvider()
        let caught: Error | undefined
        try {
          await p.searchHotels({
            cityCode: 'PAR',
            checkInDate: '2026-06-01',
            checkOutDate: '2026-06-04',
          })
        } catch (error) {
          caught = error as Error
        }
        expect(caught?.message).toContain('credentials not configured')
        const cause = caught?.cause as { code?: string } | undefined
        expect(cause?.code).toBe('MISSING_CREDENTIALS')
      } finally {
        if (originalId !== undefined) {
          process.env['AMADEUS_CLIENT_ID'] = originalId
        } else {
          delete process.env['AMADEUS_CLIENT_ID']
        }
        if (originalSecret !== undefined) process.env['AMADEUS_CLIENT_SECRET'] = originalSecret
      }
    })

    it('should never include the client_secret in error messages', async () => {
      const p = createProvider({ clientId: 'test-id', clientSecret: 'super-secret-token' })
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse({}, 401))
      vi.stubGlobal('fetch', mock)

      let caught: Error | undefined
      try {
        await p.searchHotels({
          cityCode: 'PAR',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
        })
      } catch (error) {
        caught = error as Error
      }
      expect(caught).toBeDefined()
      expect(caught?.message).not.toContain('super-secret-token')
      expect(caught?.message).toContain('status 401')
      const cause = caught?.cause as { code?: string } | undefined
      expect(cause?.code).toBe('TOKEN_MINT_FAILED')
    })

    it('should reuse a cached token across consecutive calls', async () => {
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
      mock.mockResolvedValueOnce(mockFetchResponse({ data: [] }))
      mock.mockResolvedValueOnce(mockFetchResponse({ data: [] }))
      vi.stubGlobal('fetch', mock)

      const p = createProvider({ clientId: 'test-id', clientSecret: 'test-secret' })
      await p.getHotelOffers('A', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
      })
      await p.getHotelOffers('B', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
      })

      // 1 token mint + 2 data calls = 3 total fetches
      expect(mock).toHaveBeenCalledTimes(3)
      // First call is the token mint; subsequent are data calls.
      const dataInit1 = mock.mock.calls[1][1] as { headers: Record<string, string> }
      const dataInit2 = mock.mock.calls[2][1] as { headers: Record<string, string> }
      expect(dataInit1.headers.Authorization).toBe('Bearer test-access-token')
      expect(dataInit2.headers.Authorization).toBe('Bearer test-access-token')
    })

    it('should re-mint the token when the cached one is expired (skew honoured)', async () => {
      const mock = vi.fn()
      // Skew set to subtract entire 1799s lifetime, so cache is born stale.
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture)) // first mint
      mock.mockResolvedValueOnce(mockFetchResponse({ data: [] })) // first data call
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture)) // second mint (forced)
      mock.mockResolvedValueOnce(mockFetchResponse({ data: [] })) // second data call
      vi.stubGlobal('fetch', mock)

      const p = createProvider({
        clientId: 'test-id',
        clientSecret: 'test-secret',
        tokenSkewSeconds: 1799,
      })

      await p.getHotelOffers('A', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
      })
      await p.getHotelOffers('B', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
      })

      // 2 token mints + 2 data calls = 4 total fetches
      expect(mock).toHaveBeenCalledTimes(4)
      const tokenUrls = mock.mock.calls.filter((c) =>
        (c[0] as string).endsWith('/v1/security/oauth2/token'),
      )
      expect(tokenUrls).toHaveLength(2)
    })
  })

  describe('config overrides', () => {
    it('should respect a custom baseUrl', async () => {
      const p = createProvider({
        clientId: 'test-id',
        clientSecret: 'test-secret',
        baseUrl: 'https://test.api.amadeus.com',
      })
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
      mock.mockResolvedValueOnce(mockFetchResponse({ data: [] }))
      vi.stubGlobal('fetch', mock)

      await p.getHotelOffers('MCLONGHM', {
        checkInDate: '2026-06-01',
        checkOutDate: '2026-06-02',
      })

      const tokenUrl = mock.mock.calls[0][0] as string
      const dataUrl = mock.mock.calls[1][0] as string
      expect(tokenUrl.startsWith('https://test.api.amadeus.com/')).toBe(true)
      expect(dataUrl.startsWith('https://test.api.amadeus.com/')).toBe(true)
    })

    it('should reject when the data fetch is aborted by timeout', async () => {
      const p = createProvider({
        clientId: 'test-id',
        clientSecret: 'test-secret',
        timeout: 25,
      })
      const mock = vi.fn()
      mock.mockResolvedValueOnce(mockFetchResponse(tokenFixture))
      mock.mockImplementationOnce(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            })
          }),
      )
      vi.stubGlobal('fetch', mock)

      await expect(
        p.getHotelOffers('MCLONGHM', {
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-02',
        }),
      ).rejects.toThrow()
    })
  })
})
