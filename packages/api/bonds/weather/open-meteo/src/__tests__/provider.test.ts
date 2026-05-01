import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WeatherProvider } from '@molecule/api-weather'

import { createProvider, summarizeWmoCode } from '../provider.js'

/**
 * Builds a fake `Response` for `vi.stubGlobal('fetch', ...)`.
 */
const mockFetchResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as Response

/**
 * Realistic `current` block returned by Open-Meteo when the
 * `current=temperature_2m,...` query parameter is set.
 */
const currentFixture = {
  time: '2026-05-01T12:00',
  interval: 900,
  temperature_2m: 18.5,
  apparent_temperature: 17.9,
  relative_humidity_2m: 64,
  precipitation: 0,
  wind_speed_10m: 12.4,
  wind_direction_10m: 215,
  wind_gusts_10m: 22.1,
  weather_code: 1,
}

/**
 * Realistic `hourly` block returned by Open-Meteo when the
 * `hourly=temperature_2m,...` query parameter is set.
 */
const hourlyFixture = {
  time: ['2026-05-01T12:00', '2026-05-01T13:00', '2026-05-01T14:00'],
  temperature_2m: [18.5, 19.2, 19.8],
  apparent_temperature: [17.9, 18.6, 19.3],
  relative_humidity_2m: [64, 60, 58],
  precipitation: [0, 0, 0.2],
  wind_speed_10m: [12.4, 13.1, 14.0],
  wind_direction_10m: [215, 220, 225],
  wind_gusts_10m: [22.1, 24.0, 26.5],
  weather_code: [1, 2, 61],
}

/**
 * Realistic `daily` block returned by Open-Meteo when the
 * `daily=temperature_2m_min,...` query parameter is set.
 */
const dailyFixture = {
  time: ['2026-05-01', '2026-05-02', '2026-05-03'],
  temperature_2m_min: [11.2, 12.0, 9.8],
  temperature_2m_max: [21.7, 22.5, 18.4],
  apparent_temperature_min: [10.5, 11.4, 9.0],
  apparent_temperature_max: [21.0, 22.0, 17.9],
  relative_humidity_2m_mean: [60, 65, 78],
  precipitation_sum: [1.4, 0, 8.6],
  wind_speed_10m_max: [18.0, 22.0, 28.5],
  wind_direction_10m_dominant: [220, 215, 200],
  wind_gusts_10m_max: [35.0, 40.0, 52.0],
  weather_code: [61, 2, 80],
}

const buildResponse = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  latitude: 40.71,
  longitude: -74.0,
  timezone: 'America/New_York',
  ...overrides,
})

describe('open-meteo weather provider', () => {
  let provider: WeatherProvider

  beforeEach(() => {
    provider = createProvider()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with the expected methods', () => {
      expect(provider).toBeDefined()
      expect(provider.getCurrent).toBeInstanceOf(Function)
      expect(provider.getForecast).toBeInstanceOf(Function)
      expect(provider.getHourly).toBeInstanceOf(Function)
    })
  })

  describe('summarizeWmoCode', () => {
    it('should map common codes to readable summaries', () => {
      expect(summarizeWmoCode(0)).toBe('Clear sky')
      expect(summarizeWmoCode(1)).toBe('Mainly clear')
      expect(summarizeWmoCode(3)).toBe('Overcast')
      expect(summarizeWmoCode(45)).toBe('Fog')
      expect(summarizeWmoCode(61)).toBe('Light rain')
      expect(summarizeWmoCode(95)).toBe('Thunderstorm')
    })

    it('should fall back to "Unknown" for unrecognised codes', () => {
      expect(summarizeWmoCode(999)).toBe('Unknown')
    })
  })

  describe('getCurrent', () => {
    it('should map the current block to a normalized reading', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture }))),
      )

      const result = await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      expect(result.time).toEqual(new Date('2026-05-01T12:00'))
      expect(result.temperatureC).toBe(18.5)
      expect(result.feelsLikeC).toBe(17.9)
      expect(result.humidity).toBe(64)
      expect(result.precipitationMm).toBe(0)
      expect(result.wind.speedKmh).toBe(12.4)
      expect(result.wind.directionDeg).toBe(215)
      expect(result.wind.gustKmh).toBe(22.1)
      expect(result.code).toBe(1)
      expect(result.summary).toBe('Mainly clear')
    })

    it('should request the /forecast endpoint with current vars', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://api.open-meteo.com/v1/forecast?')
      expect(calledUrl).toContain('latitude=40.7128')
      expect(calledUrl).toContain('longitude=-74.006')
      expect(calledUrl).toContain('current=temperature_2m')
      expect(calledUrl).toContain('weather_code')
      expect(calledUrl).toContain('timezone=auto')
    })

    it('should pass through a caller-supplied timezone', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getCurrent({ lat: 40.7128, lon: -74.006, timezone: 'America/New_York' })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('timezone=America%2FNew_York')
    })

    it('should fall back to the first hourly entry when current is absent', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const result = await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      expect(result.time).toEqual(new Date('2026-05-01T12:00'))
      expect(result.temperatureC).toBe(18.5)
      expect(result.code).toBe(1)
    })

    it('should throw when the response has neither a current nor hourly block', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      await expect(provider.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        'Open-Meteo response did not include a current weather block',
      )
    })

    it('should treat null wind gust as undefined gustKmh', async () => {
      const noGust = { ...currentFixture, wind_gusts_10m: null }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: noGust }))),
      )

      const result = await provider.getCurrent({ lat: 0, lon: 0 })

      expect(result.wind.gustKmh).toBeUndefined()
    })

    it('should preserve a null wind direction', async () => {
      const calmWind = { ...currentFixture, wind_direction_10m: null }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: calmWind }))),
      )

      const result = await provider.getCurrent({ lat: 0, lon: 0 })

      expect(result.wind.directionDeg).toBeNull()
    })
  })

  describe('getForecast', () => {
    it('should map the daily block to normalized entries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture }))),
      )

      const days = await provider.getForecast({ lat: 40.7128, lon: -74.006 })

      expect(days).toHaveLength(3)
      expect(days[0].date).toEqual(new Date('2026-05-01'))
      expect(days[0].temperatureMinC).toBe(11.2)
      expect(days[0].temperatureMaxC).toBe(21.7)
      expect(days[0].feelsLikeMinC).toBe(10.5)
      expect(days[0].feelsLikeMaxC).toBe(21.0)
      expect(days[0].humidity).toBe(60)
      expect(days[0].precipitationMm).toBe(1.4)
      expect(days[0].wind.speedKmh).toBe(18.0)
      expect(days[0].wind.directionDeg).toBe(220)
      expect(days[0].wind.gustKmh).toBe(35.0)
      expect(days[0].code).toBe(61)
      expect(days[0].summary).toBe('Light rain')
    })

    it('should default to 7 forecast days', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getForecast({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('forecast_days=7')
    })

    it('should respect a custom days count', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getForecast({ lat: 0, lon: 0 }, 14)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('forecast_days=14')
    })

    it('should slice to the requested days when the response has more', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 }, 2)

      expect(days).toHaveLength(2)
    })

    it('should request the daily aggregate variables', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getForecast({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('daily=temperature_2m_min')
      expect(calledUrl).toContain('precipitation_sum')
      expect(calledUrl).toContain('wind_speed_10m_max')
    })

    it('should return an empty array when daily is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days).toEqual([])
    })

    it('should treat null wind gust max as undefined gustKmh', async () => {
      const dailyNoGust = {
        ...dailyFixture,
        wind_gusts_10m_max: [null, null, null],
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyNoGust }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days[0].wind.gustKmh).toBeUndefined()
    })
  })

  describe('getHourly', () => {
    it('should map the hourly block to normalized entries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const hours = await provider.getHourly({ lat: 40.7128, lon: -74.006 }, 3)

      expect(hours).toHaveLength(3)
      expect(hours[0].time).toEqual(new Date('2026-05-01T12:00'))
      expect(hours[0].temperatureC).toBe(18.5)
      expect(hours[2].code).toBe(61)
      expect(hours[2].summary).toBe('Light rain')
    })

    it('should request the hourly variables', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHourly({ lat: 0, lon: 0 }, 24)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('hourly=temperature_2m')
      expect(calledUrl).toContain('apparent_temperature')
      expect(calledUrl).toContain('weather_code')
    })

    it('should request enough days to cover the hour count', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHourly({ lat: 0, lon: 0 }, 48)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      // 48 hours -> 2 days
      expect(calledUrl).toContain('forecast_days=2')
    })

    it('should default to 24 hours and request a single forecast day', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHourly({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('forecast_days=1')
    })

    it('should slice to the requested hours when the response has more', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const hours = await provider.getHourly({ lat: 0, lon: 0 }, 2)

      expect(hours).toHaveLength(2)
    })

    it('should return an empty array when hourly is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      const hours = await provider.getHourly({ lat: 0, lon: 0 })

      expect(hours).toEqual([])
    })
  })

  describe('config overrides', () => {
    it('should use a custom base URL', async () => {
      const p = createProvider({ baseUrl: 'https://customer-api.open-meteo.com/v1' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://customer-api.open-meteo.com/v1/forecast?')).toBe(true)
    })

    it('should append apikey when configured', async () => {
      const p = createProvider({ apiKey: 'secret-token' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('apikey=secret-token')
    })

    it('should use defaultTimezone when location.timezone is omitted', async () => {
      const p = createProvider({ defaultTimezone: 'UTC' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('timezone=UTC')
    })
  })

  describe('error handling', () => {
    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      await expect(provider.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        'failed with status 429',
      )
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ timeout: 25 })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(
          (_url: string, options: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              options.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }),
        ),
      )

      await expect(p.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow()
    })
  })
})
