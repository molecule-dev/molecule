/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.open-meteo.com`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCurrent, getForecast, setProvider } from '@molecule/api-weather'

import { provider as openMeteo } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads current weather and a 3-day forecast through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.searchParams.has('current')) {
        return Response.json({
          current: {
            time: '2026-09-24T14:00',
            temperature_2m: 18.4,
            apparent_temperature: 17.9,
            relative_humidity_2m: 62,
            precipitation: 0,
            wind_speed_10m: 11.2,
            wind_direction_10m: 240,
            weather_code: 2,
          },
        })
      }
      return Response.json({
        daily: {
          time: ['2026-09-24', '2026-09-25', '2026-09-26'],
          weather_code: [2, 61, 0],
          temperature_2m_min: [11, 12, 9],
          temperature_2m_max: [19, 16, 21],
          apparent_temperature_min: [10, 11, 8],
          apparent_temperature_max: [18, 15, 20],
          relative_humidity_2m_mean: [60, 80, 55],
          precipitation_sum: [0, 4.2, 0],
          wind_speed_10m_max: [15, 22, 10],
          wind_direction_10m_dominant: [240, 200, 90],
          wind_gusts_10m_max: [30, 41, 18],
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(openMeteo)

    const berlin = { lat: 52.52, lon: 13.405, timezone: 'Europe/Berlin' }

    const now = await getCurrent(berlin)
    expect(now).toEqual({
      time: new Date('2026-09-24T14:00'),
      temperatureC: 18.4,
      feelsLikeC: 17.9,
      humidity: 62,
      precipitationMm: 0,
      wind: { speedKmh: 11.2, directionDeg: 240 },
      code: 2,
      summary: 'Partly cloudy',
    })

    const nextThreeDays = await getForecast(berlin, 3)
    expect(nextThreeDays).toHaveLength(3)
    expect(nextThreeDays[1]).toMatchObject({
      temperatureMinC: 12,
      temperatureMaxC: 16,
      precipitationMm: 4.2,
      wind: { speedKmh: 22, directionDeg: 200, gustKmh: 41 },
      code: 61,
    })

    const currentUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(currentUrl.origin + currentUrl.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(currentUrl.searchParams.get('latitude')).toBe('52.52')
    expect(currentUrl.searchParams.get('longitude')).toBe('13.405')
    expect(currentUrl.searchParams.get('timezone')).toBe('Europe/Berlin')
    expect(currentUrl.searchParams.has('apikey')).toBe(false)
    const forecastUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(forecastUrl.searchParams.get('forecast_days')).toBe('3')
  })
})
