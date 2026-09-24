/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.openweathermap.org`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrent, getForecast, setProvider } from '@molecule/api-weather'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-openweather-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads current weather and the default 7-day forecast through the core', async () => {
    const day = (i: number) => ({
      dt: 1790000000 + i * 86400,
      temp: { min: 10 + i, max: 18 + i },
      feels_like: { morn: 9, day: 17, eve: 15, night: 8 },
      humidity: 70,
      wind_speed: 5,
      wind_deg: 200,
      weather: [{ id: 800 }],
    })
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.searchParams.get('exclude') === 'minutely,hourly,daily') {
        return Response.json({
          current: {
            dt: 1790000000,
            temp: 16.2,
            feels_like: 15.8,
            humidity: 72,
            wind_speed: 5,
            wind_deg: 230,
            rain: { '1h': 0.4 },
            weather: [{ id: 500 }],
          },
        })
      }
      return Response.json({ daily: Array.from({ length: 8 }, (_, i) => day(i)) })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.OPENWEATHER_API_KEY }))

    const london = { lat: 51.5072, lon: -0.1276 }

    const now = await getCurrent(london)
    expect(now).toEqual({
      time: new Date(1790000000 * 1000),
      temperatureC: 16.2,
      feelsLikeC: 15.8,
      humidity: 72,
      precipitationMm: 0.4,
      wind: { speedKmh: 18, directionDeg: 230 },
      code: 61,
      summary: 'Light rain',
    })

    const week = await getForecast(london)
    expect(week).toHaveLength(7)
    expect(week[0]).toMatchObject({
      temperatureMinC: 10,
      temperatureMaxC: 18,
      feelsLikeMinC: 8,
      feelsLikeMaxC: 17,
      code: 0,
    })

    const currentUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(currentUrl.origin + currentUrl.pathname).toBe(
      'https://api.openweathermap.org/data/3.0/onecall',
    )
    expect(currentUrl.searchParams.get('appid')).toBe('test-openweather-key')
    expect(currentUrl.searchParams.get('units')).toBe('metric')
    expect(currentUrl.searchParams.get('lat')).toBe('51.5072')
  })
})
