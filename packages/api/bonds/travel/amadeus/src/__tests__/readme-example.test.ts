/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to the
 * Amadeus test API) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { searchTripOptions, setProvider } from '@molecule/api-travel'

import { createProvider } from '../index.js'

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: URL): unknown => {
  switch (url.pathname) {
    case '/v1/security/oauth2/token':
      return { access_token: 'test-access-token', expires_in: 1799, token_type: 'Bearer' }
    case '/v2/shopping/flight-offers':
      return {
        data: [
          {
            id: '1',
            price: { total: '612.40', grandTotal: '612.40', currency: 'EUR' },
            itineraries: [
              {
                duration: 'PT7H25M',
                segments: [
                  {
                    departure: { iataCode: 'JFK', at: '2026-11-10T18:30:00' },
                    arrival: { iataCode: 'CDG', at: '2026-11-11T07:55:00' },
                    carrierCode: 'AF',
                    number: '7',
                  },
                ],
              },
            ],
          },
        ],
      }
    case '/v1/reference-data/locations/hotels/by-city':
      return { data: [{ hotelId: 'HLPAR001', name: 'Hotel Lumiere' }] }
    case '/v3/shopping/hotel-offers':
      return {
        data: [
          {
            hotel: { hotelId: 'HLPAR001', name: 'Hotel Lumiere', rating: '4' },
            offers: [
              {
                id: 'OFFER1',
                checkInDate: '2026-11-10',
                checkOutDate: '2026-11-15',
                price: { total: '980.00', currency: 'EUR' },
              },
            ],
          },
        ],
      }
    case '/v1/reference-data/locations/cities':
      return { data: [{ iataCode: 'PAR', geoCode: { latitude: 48.85341, longitude: 2.3488 } }] }
    case '/v1/shopping/activities':
      return {
        data: [
          {
            id: 'ACT1',
            name: 'Louvre skip-the-line tour',
            price: { amount: '65.00', currencyCode: 'EUR' },
          },
        ],
      }
    default:
      throw new Error(`unexpected Amadeus call: ${url.pathname}`)
  }
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns normalized flights, hotels and activities for a round trip', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-client-id')
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-client-secret')
    vi.stubEnv('AMADEUS_USE_PRODUCTION', undefined)
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) =>
      json(route(new URL(String(input)))),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
      }),
    )

    const trip = await searchTripOptions({
      origin: 'NYC',
      destination: 'PAR',
      departureDate: '2026-11-10',
      returnDate: '2026-11-15',
      travelers: { adults: 2 },
      includeActivities: true,
      maxResultsPerCategory: 5,
    })

    expect(trip.flights[0]?.price).toEqual({ total: 612.4, currency: 'EUR' })
    expect(trip.flights[0]?.duration).toBe('PT7H25M')
    expect(trip.hotels[0]).toMatchObject({
      name: 'Hotel Lumiere',
      price: { total: 980, currency: 'EUR' },
      checkInDate: '2026-11-10',
      checkOutDate: '2026-11-15',
      rating: 4,
    })
    expect(trip.activities[0]).toMatchObject({ name: 'Louvre skip-the-line tour' })
    expect(trip.cars).toEqual([])

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)))
    expect(urls.every((u) => u.origin === 'https://test.api.amadeus.com')).toBe(true)
    const flightSearch = urls.find((u) => u.pathname === '/v2/shopping/flight-offers')
    expect(flightSearch?.searchParams.get('originLocationCode')).toBe('NYC')
    expect(flightSearch?.searchParams.get('adults')).toBe('2')
    expect(
      urls.find((u) => u.pathname.endsWith('/hotels/by-city'))?.searchParams.get('cityCode'),
    ).toBe('PAR')
  })
})
