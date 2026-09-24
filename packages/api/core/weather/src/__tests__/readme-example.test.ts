/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Open-Meteo bond with
 * only `fetch` (`api.open-meteo.com`) mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider as openMeteo } from '@molecule/api-weather-open-meteo'

import { getCurrent, getForecast, getHourly, setProvider } from '../index.js'

const hourly = {
  time: ['2026-09-24T14:00', '2026-09-24T15:00'],
  temperature_2m: [21, 20],
  apparent_temperature: [21, 19.5],
  relative_humidity_2m: [55, 60],
  precipitation: [0, 1.2],
  wind_speed_10m: [12, 14],
  wind_direction_10m: [180, 190],
  wind_gusts_10m: [20, 25],
  weather_code: [1, 61],
}

describe('README @example', () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.searchParams.has('current')) {
      return Response.json({
        current: {
          time: '2026-09-24T14:00',
          temperature_2m: 21,
          apparent_temperature: 21,
          relative_humidity_2m: 55,
          precipitation: 0,
          wind_speed_10m: 12,
          wind_direction_10m: 180,
          weather_code: 1,
        },
      })
    }
    if (url.searchParams.has('daily')) {
      return Response.json({
        daily: {
          time: ['2026-09-24', '2026-09-25'],
          weather_code: [1, 61],
          temperature_2m_min: [15, 14],
          temperature_2m_max: [23, 19],
          apparent_temperature_min: [15, 13],
          apparent_temperature_max: [23, 18],
          relative_humidity_2m_mean: [55, 80],
          precipitation_sum: [0, 6.5],
          wind_speed_10m_max: [15, 22],
          wind_direction_10m_dominant: [180, 200],
          wind_gusts_10m_max: [25, 40],
        },
      })
    }
    return Response.json({ hourly })
  })

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads current conditions, a daily forecast, and an hourly forecast', async () => {
    setProvider(openMeteo)

    const nyc = { lat: 40.7128, lon: -74.006, timezone: 'America/New_York' }

    const now = await getCurrent(nyc)
    expect(`${now.temperatureC}°C, ${now.summary}`).toBe('21°C, Mainly clear')

    const week = await getForecast(nyc, 7)
    expect(week.map((day) => [day.temperatureMinC, day.temperatureMaxC, day.code])).toEqual([
      [15, 23, 1],
      [14, 19, 61],
    ])

    const next12Hours = await getHourly(nyc, 12)
    const rainSoon = next12Hours.some((hour) => hour.precipitationMm > 0)
    expect(next12Hours).toHaveLength(2)
    expect(rainSoon).toBe(true)

    const forecastUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(forecastUrl.searchParams.get('forecast_days')).toBe('7')
    expect(forecastUrl.searchParams.get('timezone')).toBe('America/New_York')
  })
})
