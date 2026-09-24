/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.mapbox.com`) is stubbed.
 *
 * @module
 */
import { randomUUID } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { autocomplete, geocode, getTimezone, setProvider } from '@molecule/api-geolocation'

import { createProvider } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: string): Response => {
  if (url.includes('/search/geocode/v6/forward'))
    return json({
      type: 'FeatureCollection',
      features: [
        {
          id: 'address.1',
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-77.0365, 38.8977] },
          properties: {
            mapbox_id: 'dXJuOm1ieGFkcjox',
            feature_type: 'address',
            name: '1600 Pennsylvania Avenue Northwest',
            full_address:
              '1600 Pennsylvania Avenue Northwest, Washington, District of Columbia 20500, United States',
            context: {
              postcode: { name: '20500' },
              place: { name: 'Washington' },
              region: { name: 'District of Columbia', region_code: 'DC' },
              country: { name: 'United States', country_code: 'us' },
            },
          },
        },
      ],
    })
  if (url.includes('/search/searchbox/v1/suggest'))
    return json({
      suggestions: [
        {
          name: '1600 Pennsylvania Avenue Northwest',
          mapbox_id: 'dXJuOm1ieGFkcjox',
          feature_type: 'address',
          full_address: '1600 Pennsylvania Avenue Northwest, Washington, DC 20500',
          place_formatted: 'Washington, DC 20500',
        },
      ],
    })
  return json({ message: 'Not Found' })
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, MAPBOX_ACCESS_TOKEN: 'test-token' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('geocodes an address and runs a session-scoped autocomplete', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    const accessToken = process.env.MAPBOX_ACCESS_TOKEN
    if (!accessToken) throw new Error('MAPBOX_ACCESS_TOKEN is not set')
    setProvider(createProvider({ accessToken, language: 'en', country: 'us' }))

    const [place] = await geocode('1600 Pennsylvania Ave NW, Washington, DC')
    console.log(place?.lat, place?.lng, place?.components.postalCode)

    const sessionToken = randomUUID()
    const suggestions = await autocomplete('1600 Penn', { sessionToken, limit: 5 })
    console.log(suggestions.map((s) => s.description))

    expect(log).toHaveBeenNthCalledWith(1, 38.8977, -77.0365, '20500')
    expect(log).toHaveBeenNthCalledWith(2, [
      '1600 Pennsylvania Avenue Northwest, Washington, DC 20500',
    ])
    expect(place?.components).toMatchObject({ stateCode: 'DC', countryCode: 'US' })

    const geocodeUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(geocodeUrl.searchParams.get('access_token')).toBe('test-token')
    expect(geocodeUrl.searchParams.get('country')).toBe('us')
    const suggestUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(suggestUrl.searchParams.get('session_token')).toBe(sessionToken)
    expect(suggestUrl.searchParams.get('limit')).toBe('5')
  })

  it('has no timezone support — the core getTimezone() throws', async () => {
    setProvider(createProvider({ accessToken: 'test-token' }))
    await expect(getTimezone(38.8977, -77.0365)).rejects.toThrow(/timezone/i)
  })
})
