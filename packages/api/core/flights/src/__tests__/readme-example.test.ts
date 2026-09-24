/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Amadeus bond. Only
 * `fetch` (the Amadeus HTTP API) is stubbed, the same way the bond's own tests
 * stub it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-flights-amadeus'

import { priceOffer, searchFlights, setProvider } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  ({
    ok: true,
    status: 200,
    headers: { get: (): string | null => null },
    json: () => Promise.resolve(data),
  }) as unknown as Response

const offer = (id: string, total: string): Record<string, unknown> => ({
  type: 'flight-offer',
  id,
  itineraries: [
    {
      duration: 'PT7H30M',
      segments: [
        {
          departure: { iataCode: 'JFK', at: '2026-07-15T19:00:00' },
          arrival: { iataCode: 'LHR', at: '2026-07-16T07:30:00' },
          carrierCode: 'BA',
          number: '178',
        },
      ],
    },
  ],
  price: { total, grandTotal: total, currency: 'USD' },
})

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Amadeus, searches, picks the cheapest offer and re-prices it', async () => {
    vi.stubEnv('AMADEUS_CLIENT_ID', 'test-id')
    vi.stubEnv('AMADEUS_CLIENT_SECRET', 'test-secret')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok', expires_in: 1799 }))
      .mockResolvedValueOnce(jsonResponse({ data: [offer('1', '542.50'), offer('2', '480.10')] }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: { type: 'flight-offers-pricing', flightOffers: [offer('2', '495.20')] },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      }),
    )

    const offers = await searchFlights({
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2026-07-15',
      adults: 1,
    })
    const cheapest = [...offers].sort((a, b) => a.price - b.price)[0]
    if (!cheapest) throw new Error('No flights for this route and date')
    expect(cheapest).toMatchObject({ id: '2', price: 480.1, currency: 'USD' })

    const priced = await priceOffer(cheapest.id)
    const label = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: priced.currency,
    }).format(priced.price)

    expect(priced).toMatchObject({ offerId: '2', price: 495.2, currency: 'USD' })
    expect(label).toBe('$495.20')
    const searchUrl = String(fetchMock.mock.calls[1]?.[0])
    expect(searchUrl).toContain('https://test.api.amadeus.com/v2/shopping/flight-offers?')
    expect(searchUrl).toContain('originLocationCode=JFK')
    expect(searchUrl).toContain('destinationLocationCode=LHR')
  })
})
