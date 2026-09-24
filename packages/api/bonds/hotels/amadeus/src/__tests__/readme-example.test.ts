/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `test.api.amadeus.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHotelOffers, searchHotels, setProvider } from '@molecule/api-hotels'

import { createProvider } from '../index.js'

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const offersBody = {
  data: [
    {
      hotel: { hotelId: 'HLPAR266', name: 'Hotel Le Marais', cityCode: 'PAR' },
      offers: [
        {
          id: 'OFFER-1',
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-18',
          guests: { adults: 2 },
          room: { description: { text: 'Superior double room' } },
          price: { total: '612.40', currency: 'EUR' },
        },
      ],
    },
  ],
}

const route = (url: string): Response => {
  if (url.endsWith('/v1/security/oauth2/token'))
    return json({ access_token: 'test-token', expires_in: 1799, token_type: 'Bearer' })
  if (url.includes('/v1/reference-data/locations/hotels/by-city?'))
    return json({
      data: [
        {
          hotelId: 'HLPAR266',
          name: 'Hotel Le Marais',
          iataCode: 'PAR',
          geoCode: { latitude: 48.857, longitude: 2.358 },
        },
      ],
    })
  if (url.includes('/v3/shopping/hotel-offers?')) return json(offersBody)
  return json({ errors: [{ detail: 'not found' }] }, 404)
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AMADEUS_CLIENT_ID: 'test-client-id',
      AMADEUS_CLIENT_SECRET: 'test-client-secret',
    }
    delete process.env.AMADEUS_USE_PRODUCTION
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('searches a city on the test host and lists priced offers for the first hotel', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
        useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
      }),
    )

    const stay = { checkInDate: '2026-12-15', checkOutDate: '2026-12-18', adults: 2 }

    const hotels = await searchHotels({ cityCode: 'PAR', ...stay })

    const first = hotels[0]
    if (first) {
      const offers = await getHotelOffers(first.hotelId, stay)
      console.log(first.name, offers[0]?.price.total)
      expect(offers).toEqual([
        {
          offerId: 'OFFER-1',
          hotelId: 'HLPAR266',
          checkInDate: '2026-12-15',
          checkOutDate: '2026-12-18',
          price: { total: 612.4, currency: 'EUR' },
          roomDescription: 'Superior double room',
          adults: 2,
        },
      ])
    }

    expect(hotels).toHaveLength(1)
    expect(hotels[0]).toMatchObject({
      hotelId: 'HLPAR266',
      name: 'Hotel Le Marais',
      cityCode: 'PAR',
      fromPrice: { total: 612.4, currency: 'EUR' },
    })
    expect(log).toHaveBeenCalledWith('Hotel Le Marais', 612.4)
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toBe('https://test.api.amadeus.com/v1/security/oauth2/token')
    expect(urls[1]).toContain('cityCode=PAR')
  })
})
