/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `test.api.amadeus.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { priceOffer, searchFlights, setProvider } from '@molecule/api-flights'

import { AmadeusRateLimitedError, createProvider } from '../index.js'

const json = (data: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

const offer = {
  type: 'flight-offer',
  id: '1',
  itineraries: [
    {
      duration: 'PT7H30M',
      segments: [
        {
          departure: { iataCode: 'JFK', at: '2026-12-15T19:00:00', terminal: '4' },
          arrival: { iataCode: 'LHR', at: '2026-12-16T07:30:00', terminal: '3' },
          carrierCode: 'BA',
          number: '178',
          duration: 'PT7H30M',
        },
      ],
    },
  ],
  price: { total: '542.50', grandTotal: '542.50', currency: 'USD' },
}

const route = (url: string): Response => {
  if (url.endsWith('/v1/security/oauth2/token'))
    return json({ access_token: 'test-token', expires_in: 1799, token_type: 'Bearer' })
  if (url.includes('/v2/shopping/flight-offers?')) return json({ data: [offer] })
  if (url.endsWith('/v1/shopping/flight-offers/pricing'))
    return json({
      data: {
        type: 'flight-offers-pricing',
        flightOffers: [{ ...offer, price: { total: '558.00', currency: 'USD' } }],
      },
    })
  return json({ errors: [] }, 404)
}

/**
 * Runs the example body as written.
 *
 * @returns Nothing; logs or warns like the example.
 */
const runExample = async (): Promise<void> => {
  setProvider(
    createProvider({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET,
      useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
    }),
  )

  try {
    const offers = await searchFlights({
      origin: 'JFK',
      destination: 'LHR',
      departureDate: '2026-12-15',
      adults: 1,
      maxResults: 5,
    })

    const cheapest = offers[0]
    if (cheapest) {
      const quote = await priceOffer(cheapest.id)
      console.log(`${cheapest.segments.length} segment(s), ${quote.price} ${quote.currency}`)
    }
  } catch (error) {
    if (!(error instanceof AmadeusRateLimitedError)) throw error
    console.warn(`Amadeus rate-limited; retry in ${error.retryAfterSeconds ?? 1}s`)
  }
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

  it('searches the test host, then re-prices the cheapest offer', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) =>
      route(String(input)),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await runExample()

    expect(log).toHaveBeenCalledWith('1 segment(s), 558 USD')
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls[0]).toBe('https://test.api.amadeus.com/v1/security/oauth2/token')
    expect(urls[1]).toContain('originLocationCode=JFK')
    expect(urls[1]).toContain('max=5')
    expect(urls[2]).toBe('https://test.api.amadeus.com/v1/shopping/flight-offers/pricing')
    const searchInit = fetchMock.mock.calls[1]?.[1]
    expect((searchInit?.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
  })

  it('throws AmadeusRateLimitedError on HTTP 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ errors: [] }, 429, { 'retry-after': '2' })),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await runExample()

    expect(warn).toHaveBeenCalledWith('Amadeus rate-limited; retry in 2s')
  })
})
