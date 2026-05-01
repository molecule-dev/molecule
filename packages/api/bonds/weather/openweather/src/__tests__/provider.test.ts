import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WeatherProvider } from '@molecule/api-weather'

import { createProvider, owmCodeToWmoCode, summarizeWmoCode } from '../provider.js'

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
 * Realistic `current` block returned by OpenWeather One Call 3.0 with
 * `units=metric`. Wind speeds are m/s, temperatures °C, precipitation mm.
 */
const currentFixture = {
  dt: 1746105600, // 2025-05-01T12:00:00Z
  temp: 18.5,
  feels_like: 17.9,
  humidity: 64,
  wind_speed: 3.45, // m/s -> 12.42 km/h
  wind_deg: 215,
  wind_gust: 6.14, // m/s -> 22.104 km/h
  weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
}

/**
 * Realistic `hourly[]` block returned by OpenWeather One Call 3.0.
 * Three sample hours covering clear → partly cloudy → light rain.
 */
const hourlyFixture = [
  {
    dt: 1746105600,
    temp: 18.5,
    feels_like: 17.9,
    humidity: 64,
    wind_speed: 3.45,
    wind_deg: 215,
    wind_gust: 6.14,
    weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
  },
  {
    dt: 1746109200,
    temp: 19.2,
    feels_like: 18.6,
    humidity: 60,
    wind_speed: 3.64,
    wind_deg: 220,
    wind_gust: 6.67,
    weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
  },
  {
    dt: 1746112800,
    temp: 19.8,
    feels_like: 19.3,
    humidity: 58,
    wind_speed: 3.89,
    wind_deg: 225,
    wind_gust: 7.36,
    weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
    rain: { '1h': 0.5 },
  },
]

/**
 * Realistic `daily[]` block returned by OpenWeather One Call 3.0.
 * Three sample days with varying weather codes.
 */
const dailyFixture = [
  {
    dt: 1746100800,
    temp: { day: 21.7, min: 11.2, max: 21.7, night: 13.5, eve: 18.2, morn: 11.8 },
    feels_like: { day: 21.0, night: 13.0, eve: 17.7, morn: 10.5 },
    humidity: 60,
    wind_speed: 5.0, // 18 km/h
    wind_deg: 220,
    wind_gust: 9.72, // 35 km/h
    weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
    rain: 1.4,
  },
  {
    dt: 1746187200,
    temp: { day: 22.5, min: 12.0, max: 22.5, night: 14.0, eve: 19.0, morn: 12.5 },
    feels_like: { day: 22.0, night: 13.6, eve: 18.5, morn: 11.4 },
    humidity: 65,
    wind_speed: 6.11, // ~22 km/h
    wind_deg: 215,
    wind_gust: 11.11, // ~40 km/h
    weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
  },
  {
    dt: 1746273600,
    temp: { day: 18.4, min: 9.8, max: 18.4, night: 11.0, eve: 15.5, morn: 10.3 },
    feels_like: { day: 17.9, night: 10.5, eve: 14.8, morn: 9.0 },
    humidity: 78,
    wind_speed: 7.92, // ~28.5 km/h
    wind_deg: 200,
    wind_gust: 14.44, // ~52 km/h
    weather: [{ id: 521, main: 'Rain', description: 'shower rain', icon: '09d' }],
    rain: 8.6,
  },
]

const buildResponse = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  lat: 40.71,
  lon: -74.0,
  timezone: 'America/New_York',
  ...overrides,
})

const TEST_API_KEY = 'unit-test-key-abc123'

describe('openweather weather provider', () => {
  let provider: WeatherProvider

  beforeEach(() => {
    provider = createProvider({ apiKey: TEST_API_KEY })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env['OPENWEATHER_API_KEY']
    delete process.env['OPENWEATHER_BASE_URL']
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

  describe('owmCodeToWmoCode', () => {
    it('should map clear sky', () => {
      expect(owmCodeToWmoCode(800)).toBe(0)
    })

    it('should map cloud levels onto WMO 1/2/3', () => {
      expect(owmCodeToWmoCode(801)).toBe(1) // few clouds
      expect(owmCodeToWmoCode(802)).toBe(2) // scattered
      expect(owmCodeToWmoCode(803)).toBe(3) // broken
      expect(owmCodeToWmoCode(804)).toBe(3) // overcast
    })

    it('should map rain intensities onto WMO 61/63/65', () => {
      expect(owmCodeToWmoCode(500)).toBe(61) // light
      expect(owmCodeToWmoCode(501)).toBe(63) // moderate
      expect(owmCodeToWmoCode(502)).toBe(65) // heavy
      expect(owmCodeToWmoCode(504)).toBe(65) // extreme
    })

    it('should map shower-rain codes onto WMO 80/81/82', () => {
      expect(owmCodeToWmoCode(520)).toBe(80)
      expect(owmCodeToWmoCode(521)).toBe(81)
      expect(owmCodeToWmoCode(522)).toBe(82)
      expect(owmCodeToWmoCode(531)).toBe(82)
    })

    it('should map freezing rain (511) onto WMO 66', () => {
      expect(owmCodeToWmoCode(511)).toBe(66)
    })

    it('should map snow intensities onto WMO 71/73/75', () => {
      expect(owmCodeToWmoCode(600)).toBe(71)
      expect(owmCodeToWmoCode(601)).toBe(73)
      expect(owmCodeToWmoCode(602)).toBe(75)
    })

    it('should map shower-snow codes onto WMO 85/86', () => {
      expect(owmCodeToWmoCode(620)).toBe(85)
      expect(owmCodeToWmoCode(621)).toBe(86)
      expect(owmCodeToWmoCode(622)).toBe(86)
    })

    it('should map sleet / mixed precipitation onto WMO 67', () => {
      expect(owmCodeToWmoCode(611)).toBe(67)
      expect(owmCodeToWmoCode(615)).toBe(67)
      expect(owmCodeToWmoCode(616)).toBe(67)
    })

    it('should map drizzle intensities onto WMO 51/53/55', () => {
      expect(owmCodeToWmoCode(300)).toBe(51) // light drizzle
      expect(owmCodeToWmoCode(301)).toBe(53) // drizzle
      expect(owmCodeToWmoCode(302)).toBe(55) // heavy drizzle
    })

    it('should map every thunderstorm variant onto WMO 95', () => {
      expect(owmCodeToWmoCode(200)).toBe(95)
      expect(owmCodeToWmoCode(202)).toBe(95)
      expect(owmCodeToWmoCode(211)).toBe(95)
      expect(owmCodeToWmoCode(232)).toBe(95)
    })

    it('should map atmospheric obscurations (7xx) onto WMO 45 (fog)', () => {
      expect(owmCodeToWmoCode(701)).toBe(45) // mist
      expect(owmCodeToWmoCode(741)).toBe(45) // fog
      expect(owmCodeToWmoCode(751)).toBe(45) // sand
      expect(owmCodeToWmoCode(771)).toBe(45) // squall
    })

    it('should fall back to clear (0) for completely unknown codes', () => {
      expect(owmCodeToWmoCode(9999)).toBe(0)
    })
  })

  describe('getCurrent', () => {
    it('should map the current block to a normalized reading', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture }))),
      )

      const result = await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      expect(result.time).toEqual(new Date(1746105600 * 1000))
      expect(result.temperatureC).toBe(18.5)
      expect(result.feelsLikeC).toBe(17.9)
      expect(result.humidity).toBe(64)
      expect(result.precipitationMm).toBe(0)
      expect(result.wind.speedKmh).toBeCloseTo(12.42, 2)
      expect(result.wind.directionDeg).toBe(215)
      expect(result.wind.gustKmh).toBeCloseTo(22.104, 2)
      expect(result.code).toBe(1) // 801 → WMO 1 (mainly clear)
      expect(result.summary).toBe('Mainly clear')
    })

    it('should sum rain.1h and snow.1h into precipitationMm', async () => {
      const wet = {
        ...currentFixture,
        rain: { '1h': 1.2 },
        snow: { '1h': 0.3 },
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: wet }))),
      )

      const result = await provider.getCurrent({ lat: 0, lon: 0 })

      expect(result.precipitationMm).toBeCloseTo(1.5, 5)
    })

    it('should request the /onecall endpoint with the correct exclude list', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://api.openweathermap.org/data/3.0/onecall?')
      expect(calledUrl).toContain('lat=40.7128')
      expect(calledUrl).toContain('lon=-74.006')
      expect(calledUrl).toContain('units=metric')
      expect(calledUrl).toContain(`appid=${TEST_API_KEY}`)
      expect(calledUrl).toContain('exclude=minutely%2Chourly%2Cdaily')
    })

    it('should fall back to the first hourly entry when current is absent', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const result = await provider.getCurrent({ lat: 40.7128, lon: -74.006 })

      expect(result.time).toEqual(new Date(1746105600 * 1000))
      expect(result.temperatureC).toBe(18.5)
      expect(result.code).toBe(1) // 801 → WMO 1
    })

    it('should throw when the response has neither a current nor hourly block', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      await expect(provider.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        'OpenWeather response did not include a current weather block',
      )
    })

    it('should return null directionDeg when wind_deg is missing', async () => {
      const calmWind = { ...currentFixture }
      delete (calmWind as { wind_deg?: number }).wind_deg
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: calmWind }))),
      )

      const result = await provider.getCurrent({ lat: 0, lon: 0 })

      expect(result.wind.directionDeg).toBeNull()
    })

    it('should omit gustKmh when wind_gust is missing', async () => {
      const noGust = { ...currentFixture }
      delete (noGust as { wind_gust?: number }).wind_gust
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ current: noGust }))),
      )

      const result = await provider.getCurrent({ lat: 0, lon: 0 })

      expect(result.wind.gustKmh).toBeUndefined()
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
      expect(days[0].date).toEqual(new Date(1746100800 * 1000))
      expect(days[0].temperatureMinC).toBe(11.2)
      expect(days[0].temperatureMaxC).toBe(21.7)
      expect(days[0].feelsLikeMinC).toBe(10.5) // min(11.4, 10.5, 17.7, 10.5... no morn=10.5)
      expect(days[0].feelsLikeMaxC).toBe(21.0)
      expect(days[0].humidity).toBe(60)
      expect(days[0].precipitationMm).toBe(1.4)
      expect(days[0].wind.speedKmh).toBeCloseTo(18.0, 1)
      expect(days[0].wind.directionDeg).toBe(220)
      expect(days[0].wind.gustKmh).toBeCloseTo(34.992, 2) // 9.72 * 3.6
      expect(days[0].code).toBe(61) // 500 → WMO 61
      expect(days[0].summary).toBe('Light rain')
    })

    it('should derive feels_like min/max from morn/day/eve/night', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      // day0 feels_like: morn 10.5, day 21.0, eve 17.7, night 13.0
      expect(days[0].feelsLikeMinC).toBe(10.5)
      expect(days[0].feelsLikeMaxC).toBe(21.0)
    })

    it('should sum rain and snow into precipitationMm', async () => {
      const snowyDay = [
        {
          ...dailyFixture[0],
          rain: 1.2,
          snow: 0.4,
        },
      ]
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: snowyDay }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days[0].precipitationMm).toBeCloseTo(1.6, 5)
    })

    it('should request the daily endpoint with the correct exclude list', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getForecast({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('exclude=current%2Cminutely%2Chourly')
    })

    it('should default to 7 forecast days', async () => {
      // Pad the daily fixture out to 8 entries so a 7-slice still has data.
      const eightDays = [...dailyFixture, ...dailyFixture, ...dailyFixture].slice(0, 8)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: eightDays }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days).toHaveLength(7)
    })

    it('should slice to the requested days when the response has more', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 }, 2)

      expect(days).toHaveLength(2)
    })

    it('should clamp to the response length when fewer days are returned', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: dailyFixture }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 }, 30)

      expect(days).toHaveLength(3)
    })

    it('should return an empty array when daily is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days).toEqual([])
    })

    it('should null directionDeg and omit gustKmh when wind fields missing on daily', async () => {
      const noWindDaily = [{ ...dailyFixture[0] }]
      delete (noWindDaily[0] as { wind_deg?: number }).wind_deg
      delete (noWindDaily[0] as { wind_gust?: number }).wind_gust
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ daily: noWindDaily }))),
      )

      const days = await provider.getForecast({ lat: 0, lon: 0 })

      expect(days[0].wind.directionDeg).toBeNull()
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
      expect(hours[0].time).toEqual(new Date(1746105600 * 1000))
      expect(hours[0].temperatureC).toBe(18.5)
      expect(hours[2].code).toBe(61) // 500 → WMO 61
      expect(hours[2].summary).toBe('Light rain')
      expect(hours[2].precipitationMm).toBe(0.5)
    })

    it('should request the hourly endpoint with the correct exclude list', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await provider.getHourly({ lat: 0, lon: 0 }, 24)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('exclude=current%2Cminutely%2Cdaily')
    })

    it('should default to 24 hours', async () => {
      // 48-entry fixture to satisfy slicing.
      const wideHourly = Array.from({ length: 48 }, (_, i) => ({
        ...hourlyFixture[0],
        dt: 1746105600 + i * 3600,
      }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: wideHourly }))),
      )

      const hours = await provider.getHourly({ lat: 0, lon: 0 })

      expect(hours).toHaveLength(24)
    })

    it('should slice to the requested hours when the response has more', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const hours = await provider.getHourly({ lat: 0, lon: 0 }, 2)

      expect(hours).toHaveLength(2)
    })

    it('should clamp to the response length when fewer hours are returned', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse(buildResponse({ hourly: hourlyFixture }))),
      )

      const hours = await provider.getHourly({ lat: 0, lon: 0 }, 100)

      expect(hours).toHaveLength(3)
    })

    it('should return an empty array when hourly is absent', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(buildResponse())))

      const hours = await provider.getHourly({ lat: 0, lon: 0 })

      expect(hours).toEqual([])
    })
  })

  describe('config overrides', () => {
    it('should use a custom base URL', async () => {
      const p = createProvider({
        apiKey: TEST_API_KEY,
        baseUrl: 'https://proxy.internal/owm/data/3.0',
      })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl.startsWith('https://proxy.internal/owm/data/3.0/onecall?')).toBe(true)
    })

    it('should fall back to OPENWEATHER_API_KEY when apiKey is omitted', async () => {
      process.env['OPENWEATHER_API_KEY'] = 'env-fallback-key'
      const p = createProvider()
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('appid=env-fallback-key')
    })

    it('should prefer config.apiKey over the env var', async () => {
      process.env['OPENWEATHER_API_KEY'] = 'env-fallback-key'
      const p = createProvider({ apiKey: 'config-key' })
      const mockFetch = vi
        .fn()
        .mockResolvedValue(mockFetchResponse(buildResponse({ current: currentFixture })))
      vi.stubGlobal('fetch', mockFetch)

      await p.getCurrent({ lat: 0, lon: 0 })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('appid=config-key')
      expect(calledUrl).not.toContain('env-fallback-key')
    })
  })

  describe('error handling', () => {
    it('should throw a sanitized error message when the API key is missing', async () => {
      const p = createProvider()
      vi.stubGlobal('fetch', vi.fn())

      await expect(p.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        'OpenWeather API key is not configured',
      )
    })

    it('should throw on HTTP error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 429)))

      await expect(provider.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        'failed with status 429',
      )
    })

    it('should NOT include the API key in HTTP error messages', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse({}, 401)))

      await expect(provider.getCurrent({ lat: 0, lon: 0 })).rejects.toThrow(
        expect.objectContaining({
          message: expect.not.stringContaining(TEST_API_KEY) as unknown as string,
        }),
      )
    })

    it('should NOT include the API key in fetch failure error messages', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          // Mimic Node's fetch error format which sometimes leaks the URL.
          throw new Error(`fetch failed: GET ${url}`)
        }),
      )

      const error = await provider.getCurrent({ lat: 0, lon: 0 }).catch((e: Error) => e)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain(TEST_API_KEY)
      expect((error as Error).message).toContain('[REDACTED]')
    })

    it('should reject when fetch is aborted by timeout', async () => {
      const p = createProvider({ apiKey: TEST_API_KEY, timeout: 25 })
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
