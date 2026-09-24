/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `maps.googleapis.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { distance, geocode, getTimezone, setProvider } from '@molecule/api-geolocation'

import { createProvider } from '../index.js'

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

const route = (url: string): Response => {
  if (url.includes('/maps/api/geocode/json'))
    return json({
      status: 'OK',
      results: [
        {
          formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
          place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
          types: ['street_address'],
          geometry: { location: { lat: 37.4224, lng: -122.0842 } },
          address_components: [
            { long_name: '1600', short_name: '1600', types: ['street_number'] },
            {
              long_name: 'Amphitheatre Parkway',
              short_name: 'Amphitheatre Pkwy',
              types: ['route'],
            },
            { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
            { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
            { long_name: 'United States', short_name: 'US', types: ['country'] },
            { long_name: '94043', short_name: '94043', types: ['postal_code'] },
          ],
        },
      ],
    })
  if (url.includes('/maps/api/timezone/json'))
    return json({
      status: 'OK',
      timeZoneId: 'America/Los_Angeles',
      timeZoneName: 'Pacific Daylight Time',
      rawOffset: -28800,
      dstOffset: 3600,
    })
  return json({ status: 'INVALID_REQUEST' })
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: 'test-key' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('geocodes an address, measures distance and resolves its timezone', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => route(String(input)))
    vi.stubGlobal('fetch', fetchMock)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set')
    setProvider(createProvider({ apiKey, language: 'en', region: 'us' }))

    const [office] = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
    if (office) {
      const km = distance(office, { lat: 37.7749, lng: -122.4194 })
      const tz = await getTimezone(office.lat, office.lng)
      console.log(
        office.formattedAddress,
        office.components.postalCode,
        Math.round(km),
        tz.timeZoneId,
      )
    }

    expect(office).toMatchObject({
      lat: 37.4224,
      lng: -122.0842,
      components: { city: 'Mountain View', stateCode: 'CA', countryCode: 'US' },
    })
    expect(log).toHaveBeenCalledWith(
      '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
      '94043',
      49,
      'America/Los_Angeles',
    )
    const geocodeUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(geocodeUrl.searchParams.get('key')).toBe('test-key')
    expect(geocodeUrl.searchParams.get('region')).toBe('us')
    expect(geocodeUrl.searchParams.get('address')).toBe(
      '1600 Amphitheatre Parkway, Mountain View, CA',
    )
  })
})
