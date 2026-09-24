/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `nominatim.openstreetmap.org`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { distance, geocode, reverseGeocode, setProvider } from '@molecule/api-geolocation'

import { createProvider } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const downingStreet = {
  place_id: 123456,
  osm_type: 'way',
  osm_id: 1879842,
  lat: '51.5033635',
  lon: '-0.1276248',
  display_name: '10 Downing Street, Westminster, London, SW1A 2AA, United Kingdom',
  address: {
    house_number: '10',
    road: 'Downing Street',
    city: 'London',
    state: 'England',
    'ISO3166-2-lvl4': 'GB-ENG',
    country: 'United Kingdom',
    country_code: 'gb',
    postcode: 'SW1A 2AA',
  },
}

const bigBen = {
  place_id: 654321,
  osm_type: 'way',
  osm_id: 123,
  lat: '51.5007',
  lon: '-0.1246',
  display_name: 'Big Ben, Bridge Street, Westminster, London, SW1A 0AA, United Kingdom',
  address: { road: 'Bridge Street', city: 'London', country_code: 'gb', postcode: 'SW1A 0AA' },
}

const route = (url: string): Response => {
  if (url.includes('/search?')) return json([downingStreet])
  if (url.includes('/reverse?')) return json(bigBen)
  return json({ error: 'Unable to geocode' })
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NOMINATIM_USER_AGENT
    delete process.env.NOMINATIM_EMAIL
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('geocodes, reverse-geocodes and measures miles with an identifying User-Agent', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) =>
      route(String(input)),
    )
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        userAgent: process.env.NOMINATIM_USER_AGENT ?? 'acme-stores/1.0 (ops@acme.example)',
        email: process.env.NOMINATIM_EMAIL,
        countryCodes: ['gb'],
        limit: 5,
      }),
    )

    const [store] = await geocode('10 Downing Street, London')
    if (store) {
      const [here] = await reverseGeocode(51.5007, -0.1246)
      const miles = distance(store, { lat: 51.5007, lng: -0.1246 }, 'mi')
      console.log(store.components.postalCode, here?.formattedAddress, miles.toFixed(2))
    }

    expect(store).toMatchObject({
      lat: 51.5033635,
      lng: -0.1276248,
      placeId: '123456',
      components: { city: 'London', stateCode: 'ENG', countryCode: 'GB' },
    })
    expect(log).toHaveBeenCalledWith(
      'SW1A 2AA',
      'Big Ben, Bridge Street, Westminster, London, SW1A 0AA, United Kingdom',
      '0.23',
    )
    const [searchUrl, searchInit] = fetchMock.mock.calls[0] ?? []
    const params = new URL(String(searchUrl)).searchParams
    expect(params.get('countrycodes')).toBe('gb')
    expect(params.get('limit')).toBe('5')
    expect((searchInit?.headers as Record<string, string>)['User-Agent']).toBe(
      'acme-stores/1.0 (ops@acme.example)',
    )
  })
})
