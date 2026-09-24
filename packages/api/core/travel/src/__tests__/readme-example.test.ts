/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Amadeus bond with
 * only `fetch` (the Amadeus REST API) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-travel-amadeus'

import { searchTripOptions, setProvider } from '../index.js'

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: string): Response => {
  if (url.endsWith('/v1/security/oauth2/token')) {
    return json({ access_token: 'token-1', expires_in: 1799 })
  }
  if (url.includes('/v2/shopping/flight-offers')) {
    return json({
      data: [
        {
          id: '1',
          itineraries: [
            {
              duration: 'PT7H30M',
              segments: [
                {
                  departure: { iataCode: 'JFK', at: '2026-07-15T18:00:00' },
                  arrival: { iataCode: 'CDG', at: '2026-07-16T07:30:00' },
                  carrierCode: 'AF',
                  number: '23',
                  duration: 'PT7H30M',
                },
              ],
            },
          ],
          price: { total: '1234.50', grandTotal: '1234.50', currency: 'EUR' },
        },
      ],
    })
  }
  if (url.includes('/v1/reference-data/locations/hotels/by-city')) {
    return json({ data: [{ hotelId: 'HLPAR001', name: 'Hotel Lumiere' }] })
  }
  if (url.includes('/v3/shopping/hotel-offers')) {
    return json({
      data: [
        {
          hotel: { hotelId: 'HLPAR001', name: 'Hotel Lumiere' },
          offers: [
            {
              id: 'OFFER1',
              checkInDate: '2026-07-15',
              checkOutDate: '2026-07-22',
              price: { total: '980.00', currency: 'EUR' },
            },
          ],
        },
      ],
    })
  }
  throw new Error(`Unexpected fetch: ${url}`)
}

describe('README @example', () => {
  const fetchMock = vi.fn<typeof fetch>(async (input) => route(String(input)))

  beforeEach(() => {
    process.env.AMADEUS_CLIENT_ID = 'test-client'
    process.env.AMADEUS_CLIENT_SECRET = 'test-secret'
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.AMADEUS_CLIENT_ID
    delete process.env.AMADEUS_CLIENT_SECRET
  })

  it('searches flights and hotels through the bonded provider', async () => {
    setProvider(
      createProvider({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
      }),
    )

    const trip = await searchTripOptions({
      origin: 'JFK',
      destination: 'PAR',
      departureDate: '2026-07-15',
      returnDate: '2026-07-22',
      travelers: { adults: 2 },
      includeFlights: true,
      includeHotels: true,
      maxResultsPerCategory: 5,
    })

    expect(trip.flights).toHaveLength(1)
    expect(trip.flights[0]).toMatchObject({
      id: '1',
      duration: 'PT7H30M',
      price: { total: 1234.5, currency: 'EUR' },
    })
    expect(trip.hotels.map((hotel) => `${hotel.name}: ${hotel.price.total}`)).toEqual([
      'Hotel Lumiere: 980',
    ])
    expect(trip.cars).toEqual([])

    const flightUrl = fetchMock.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes('/v2/shopping/flight-offers'))
    expect(flightUrl).toContain('https://test.api.amadeus.com/')
    expect(flightUrl).toContain('adults=2')
  })
})
