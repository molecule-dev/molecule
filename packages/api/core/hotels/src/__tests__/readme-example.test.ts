/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Amadeus bond. Only
 * `fetch` (the Amadeus HTTP API) is stubbed, the same way the bond's own tests
 * stub it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-hotels-amadeus'

import { bookHotel, getHotelOffers, searchHotels, setProvider } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(data) }) as unknown as Response

const offersBody = {
  data: [
    {
      hotel: { hotelId: 'HLPAR001' },
      offers: [
        {
          id: 'OFFER-1',
          checkInDate: '2026-06-01',
          checkOutDate: '2026-06-04',
          price: { total: '612.00', currency: 'EUR' },
          guests: { adults: 2 },
        },
      ],
    },
  ],
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Amadeus, searches, fetches offers and falls back when booking is unsupported', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id')
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret')
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/v1/security/oauth2/token')) {
        return jsonResponse({ access_token: 'tok', expires_in: 1799, token_type: 'Bearer' })
      }
      if (url.includes('/v1/reference-data/locations/hotels/by-city')) {
        return jsonResponse({
          data: [{ hotelId: 'HLPAR001', name: 'Hotel Lutetia', iataCode: 'PAR', rating: '5' }],
        })
      }
      if (url.includes('/v3/shopping/hotel-offers')) return jsonResponse(offersBody)
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    )

    const stay = { checkInDate: '2026-06-01', checkOutDate: '2026-06-04', adults: 2 }
    const hotels = await searchHotels({ cityCode: 'PAR', ...stay })
    const hotel = hotels[0]
    if (!hotel) throw new Error('No hotels found for this city and dates')
    expect(hotel).toMatchObject({
      hotelId: 'HLPAR001',
      name: 'Hotel Lutetia',
      rating: 5,
      fromPrice: { total: 612, currency: 'EUR' },
    })

    const offers = await getHotelOffers(hotel.hotelId, stay)
    const offer = offers[0]
    if (!offer) throw new Error('No rooms available')
    expect(offer).toMatchObject({ offerId: 'OFFER-1', price: { total: 612, currency: 'EUR' } })

    let fellBack = false
    try {
      await bookHotel(offer.offerId, {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      })
    } catch (error) {
      const code = ((error as Error).cause as { code?: string } | undefined)?.code
      if (code !== 'BOOKING_NOT_SUPPORTED') throw error
      fellBack = true
    }
    expect(fellBack).toBe(true)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=PAR',
    )
  })
})
