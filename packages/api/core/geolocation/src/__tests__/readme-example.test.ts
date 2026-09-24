/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Nominatim bond. Only
 * `fetch` (the Nominatim HTTP API) is stubbed, the same way the bond's own
 * tests stub it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-geolocation-nominatim'

import { distance, geocode, reverseGeocode, setProvider } from '../index.js'

const jsonResponse = (data: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(data) }) as unknown as Response

const place = (lat: string, lon: string, displayName: string): Record<string, unknown> => ({
  place_id: 123456,
  lat,
  lon,
  display_name: displayName,
  address: { road: 'Amphitheatre Parkway', city: 'Mountain View', country_code: 'us' },
})

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Nominatim, geocodes, reverse-geocodes and measures distance', async () => {
    vi.stubEnv('NOMINATIM_USER_AGENT', undefined)
    vi.stubEnv('NOMINATIM_EMAIL', 'ops@acme.example')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          place('37.4224764', '-122.0842499', '1600 Amphitheatre Parkway, Mountain View'),
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse(place('37.3861', '-122.0839', 'Castro Street, Mountain View')),
      )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        userAgent: process.env.NOMINATIM_USER_AGENT ?? 'acme-stores/1.0 (ops@acme.example)',
        email: process.env.NOMINATIM_EMAIL,
      }),
    )

    const [store] = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
    if (!store) throw new Error('Address not found')
    expect(store).toMatchObject({ lat: 37.4224764, lng: -122.0842499, placeId: '123456' })

    const [here] = await reverseGeocode(37.3861, -122.0839)
    expect(here?.formattedAddress).toBe('Castro Street, Mountain View')

    const km = distance({ lat: here?.lat ?? 37.3861, lng: here?.lng ?? -122.0839 }, store)
    const miles = distance({ lat: 37.3861, lng: -122.0839 }, store, 'mi')
    expect(km).toBeGreaterThan(4)
    expect(km).toBeLessThan(5)
    expect(miles).toBeCloseTo(km * 0.621371, 2)

    const [searchUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(searchUrl).toContain('https://nominatim.openstreetmap.org/search?')
    expect(searchUrl).toContain('email=ops%40acme.example')
    expect(init.headers).toMatchObject({ 'User-Agent': 'acme-stores/1.0 (ops@acme.example)' })
  })
})
