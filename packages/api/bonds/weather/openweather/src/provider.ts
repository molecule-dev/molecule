/**
 * OpenWeather (One Call API 3.0) implementation of `WeatherProvider`.
 *
 * Wraps `https://api.openweathermap.org/data/3.0/onecall`, which returns
 * current observations plus minutely / hourly / daily forecasts for any
 * latitude-longitude pair. The provider requests metric units, converts
 * wind speeds from m/s to km/h, and maps OpenWeather's `weather[].id`
 * condition codes onto WMO 4677 numeric codes for cross-provider
 * compatibility with `@molecule/api-weather-open-meteo`.
 *
 * @module
 */

import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherLocation,
  WeatherProvider,
} from '@molecule/api-weather'

import type { OpenWeatherConfig } from './types.js'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

/** Default OpenWeather One Call 3.0 endpoint base URL. */
const DEFAULT_BASE_URL = 'https://api.openweathermap.org/data/3.0'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default forecast-day count when the caller omits `days`. */
const DEFAULT_FORECAST_DAYS = 7

/** Default hourly-forecast hour count when the caller omits `hours`. */
const DEFAULT_HOURLY_HOURS = 24

/** OpenWeather One Call 3.0 returns wind speed in m/s when `units=metric`. */
const MS_TO_KMH = 3.6

/**
 * Sentinel substring used to redact the API key from any error message.
 *
 * Per the bond contract the API key MUST NEVER appear in propagated
 * errors. We sanitize the URL passed into the upstream `Error.message`
 * by replacing the key value with this token.
 */
const REDACTED = '[REDACTED]'

/**
 * One sub-block of `weather[]` in an OpenWeather One Call response.
 * Only `id` is consumed for code mapping; the rest is preserved for
 * potential future use.
 */
interface OpenWeatherCondition {
  /** OpenWeather condition code (e.g. 800 = clear, 500 = light rain). */
  id: number
  /** Short canonical name (e.g. `'Rain'`). */
  main: string
  /** Long-form English description (e.g. `'light rain'`). */
  description: string
  /** Icon code reference (e.g. `'10d'`). */
  icon: string
}

/**
 * One Call `current` block shape.
 *
 * Units: temperature in °C, wind speed/gust in m/s, precipitation in mm,
 * humidity in percent (0–100).
 */
interface OpenWeatherCurrent {
  /** Unix timestamp (seconds) the reading applies to. */
  dt: number
  /** Air temperature, °C. */
  temp: number
  /** Apparent ("feels like") temperature, °C. */
  feels_like: number
  /** Relative humidity, percent (0–100). */
  humidity: number
  /** Wind speed at 10 m, m/s. */
  wind_speed: number
  /** Wind direction at 10 m, compass degrees (0–360). May be omitted. */
  wind_deg?: number
  /** Wind gust speed at 10 m, m/s. May be omitted when calm. */
  wind_gust?: number
  /** One or more weather condition blocks (primary at index 0). */
  weather: OpenWeatherCondition[]
  /** Optional rain accumulation block. */
  rain?: { '1h'?: number }
  /** Optional snow accumulation block. */
  snow?: { '1h'?: number }
}

/**
 * One Call `hourly[i]` block shape. Same fields as
 * {@link OpenWeatherCurrent}, with rain/snow always reporting the prior
 * hour's accumulation.
 */
interface OpenWeatherHourly {
  /** Unix timestamp (seconds). */
  dt: number
  /** Temperature, °C. */
  temp: number
  /** Apparent temperature, °C. */
  feels_like: number
  /** Humidity, percent. */
  humidity: number
  /** Wind speed, m/s. */
  wind_speed: number
  /** Wind direction, degrees. May be omitted. */
  wind_deg?: number
  /** Wind gust, m/s. May be omitted. */
  wind_gust?: number
  /** Condition blocks. */
  weather: OpenWeatherCondition[]
  /** Optional rain accumulation block. */
  rain?: { '1h'?: number }
  /** Optional snow accumulation block. */
  snow?: { '1h'?: number }
}

/**
 * One Call `daily[i].temp` shape — temperatures broken down by part of day.
 */
interface OpenWeatherDailyTemp {
  /** Daytime temperature, °C. */
  day: number
  /** Minimum temperature for the day, °C. */
  min: number
  /** Maximum temperature for the day, °C. */
  max: number
  /** Nighttime temperature, °C. */
  night: number
  /** Evening temperature, °C. */
  eve: number
  /** Morning temperature, °C. */
  morn: number
}

/**
 * One Call `daily[i].feels_like` shape — apparent temperatures broken
 * down by part of day. Note: One Call does NOT include explicit min/max
 * for `feels_like`, so the provider derives them from the four periods.
 */
interface OpenWeatherDailyFeelsLike {
  /** Daytime apparent temperature, °C. */
  day: number
  /** Nighttime apparent temperature, °C. */
  night: number
  /** Evening apparent temperature, °C. */
  eve: number
  /** Morning apparent temperature, °C. */
  morn: number
}

/**
 * One Call `daily[i]` block shape.
 */
interface OpenWeatherDaily {
  /** Unix timestamp (seconds) for the day's anchor (typically noon UTC). */
  dt: number
  /** Per-part temperature spread (°C). */
  temp: OpenWeatherDailyTemp
  /** Per-part apparent-temperature spread (°C). */
  feels_like: OpenWeatherDailyFeelsLike
  /** Mean humidity for the day, percent. */
  humidity: number
  /** Maximum wind speed observed/forecast for the day, m/s. */
  wind_speed: number
  /** Dominant wind direction for the day, compass degrees. May be omitted. */
  wind_deg?: number
  /** Maximum wind gust for the day, m/s. May be omitted. */
  wind_gust?: number
  /** Condition blocks. */
  weather: OpenWeatherCondition[]
  /** Total liquid-rain accumulation for the day, mm. May be omitted. */
  rain?: number
  /** Total snow accumulation for the day, mm. May be omitted. */
  snow?: number
}

/**
 * Top-level shape of a `/onecall` response after applying our `exclude`
 * filters. Each block is optional because we exclude blocks per call.
 */
interface OpenWeatherResponse {
  /** Latitude actually used. */
  lat: number
  /** Longitude actually used. */
  lon: number
  /** IANA timezone string (e.g. `'America/New_York'`). */
  timezone?: string
  /** Current conditions block. */
  current?: OpenWeatherCurrent
  /** Hourly forecast block (up to 48 entries on the One Call 3.0 endpoint). */
  hourly?: OpenWeatherHourly[]
  /** Daily forecast block (up to 8 entries on the One Call 3.0 endpoint). */
  daily?: OpenWeatherDaily[]
}

/**
 * Maps an OpenWeather condition code (the `id` field on
 * `weather[]`) to its closest WMO 4677 numeric code.
 *
 * The mapping is intentionally lossy — OpenWeather distinguishes more
 * intensities and qualifiers than WMO 4677 does — but the chosen WMO
 * codes preserve the rough character (clear / cloudy / rain / snow /
 * thunderstorm / fog) so consumers and tests can treat
 * `@molecule/api-weather-open-meteo` and
 * `@molecule/api-weather-openweather` interchangeably.
 *
 * Unknown codes fall through to WMO `0` (clear) which is the safest
 * default given that "no condition" responses from OpenWeather always
 * indicate clear sky.
 *
 * @param owmCode - OpenWeather condition code.
 * @returns The closest matching WMO 4677 numeric code.
 */
export const owmCodeToWmoCode = (owmCode: number): number => {
  // 2xx — Thunderstorm group.
  if (owmCode >= 200 && owmCode <= 299) {
    if (owmCode === 200 || owmCode === 230) return 95 // light/drizzle thunderstorm → thunderstorm
    if (
      owmCode === 202 ||
      owmCode === 232 ||
      owmCode === 211 ||
      owmCode === 212 ||
      owmCode === 221
    ) {
      return 95
    }
    if (owmCode === 201 || owmCode === 231) return 95
    return 95 // generic thunderstorm
  }

  // 3xx — Drizzle group.
  if (owmCode >= 300 && owmCode <= 399) {
    if (owmCode === 300 || owmCode === 310 || owmCode === 313) return 51 // light drizzle
    if (owmCode === 301 || owmCode === 311 || owmCode === 321) return 53 // moderate drizzle
    if (owmCode === 302 || owmCode === 312 || owmCode === 314) return 55 // dense drizzle
    return 53
  }

  // 5xx — Rain group.
  if (owmCode >= 500 && owmCode <= 599) {
    if (owmCode === 500) return 61 // light rain
    if (owmCode === 501) return 63 // moderate rain
    if (owmCode === 502 || owmCode === 503 || owmCode === 504) return 65 // heavy rain
    if (owmCode === 511) return 66 // freezing rain
    if (owmCode === 520) return 80 // light shower rain
    if (owmCode === 521) return 81 // shower rain
    if (owmCode === 522 || owmCode === 531) return 82 // heavy / ragged shower rain
    return 63
  }

  // 6xx — Snow group.
  if (owmCode >= 600 && owmCode <= 699) {
    if (owmCode === 600) return 71 // light snow
    if (owmCode === 601) return 73 // moderate snow
    if (owmCode === 602) return 75 // heavy snow
    if (owmCode === 611 || owmCode === 612 || owmCode === 613) return 67 // sleet → freezing rain
    if (owmCode === 615 || owmCode === 616) return 67 // mixed rain/snow
    if (owmCode === 620) return 85 // light shower snow
    if (owmCode === 621 || owmCode === 622) return 86 // heavy shower snow
    return 73
  }

  // 7xx — Atmosphere (mist / fog / smoke / dust / haze / sand / ash / squall / tornado).
  if (owmCode >= 700 && owmCode <= 799) {
    if (owmCode === 741 || owmCode === 701) return 45 // fog / mist
    return 45 // treat all atmospheric obscurations as fog for cross-provider parity
  }

  // 800 — Clear.
  if (owmCode === 800) return 0

  // 80x — Clouds.
  if (owmCode === 801) return 1 // few clouds → mainly clear
  if (owmCode === 802) return 2 // scattered clouds → partly cloudy
  if (owmCode === 803) return 3 // broken clouds → overcast (closest WMO match)
  if (owmCode === 804) return 3 // overcast clouds

  return 0
}

/**
 * Maps a WMO 4677 numeric weather code to a short English summary.
 *
 * Mirrors the table used in `@molecule/api-weather-open-meteo`
 * (intentionally — keeping the summaries identical means consumers can
 * swap providers without observing UI text changes).
 *
 * @param code - WMO 4677 weather code.
 * @returns Short English summary suitable for developer-facing logs.
 */
export const summarizeWmoCode = (code: number): string => {
  switch (code) {
    case 0:
      return 'Clear sky'
    case 1:
      return 'Mainly clear'
    case 2:
      return 'Partly cloudy'
    case 3:
      return 'Overcast'
    case 45:
    case 48:
      return 'Fog'
    case 51:
      return 'Light drizzle'
    case 53:
      return 'Moderate drizzle'
    case 55:
      return 'Dense drizzle'
    case 56:
    case 57:
      return 'Freezing drizzle'
    case 61:
      return 'Light rain'
    case 63:
      return 'Moderate rain'
    case 65:
      return 'Heavy rain'
    case 66:
    case 67:
      return 'Freezing rain'
    case 71:
      return 'Light snow'
    case 73:
      return 'Moderate snow'
    case 75:
      return 'Heavy snow'
    case 77:
      return 'Snow grains'
    case 80:
      return 'Light rain showers'
    case 81:
      return 'Moderate rain showers'
    case 82:
      return 'Violent rain showers'
    case 85:
      return 'Light snow showers'
    case 86:
      return 'Heavy snow showers'
    case 95:
      return 'Thunderstorm'
    case 96:
    case 99:
      return 'Thunderstorm with hail'
    default:
      return 'Unknown'
  }
}

/**
 * Resolves the provider's effective API key.
 *
 * Constructor-supplied configs win over the environment so the same
 * process can host multiple providers with distinct keys.
 *
 * @param config - Provider configuration.
 * @returns The effective API key, or `undefined` if neither the config
 *   nor the environment supplies one.
 */
const resolveApiKey = (config: OpenWeatherConfig): string | undefined => {
  if (config.apiKey) return config.apiKey
  return process.env['OPENWEATHER_API_KEY']
}

/**
 * Replaces every occurrence of the API key in `text` with `[REDACTED]`.
 *
 * Used to sanitize error messages before they propagate out of the bond.
 *
 * @param text - Text potentially containing the key.
 * @param apiKey - The API key to redact, or `undefined` to skip.
 * @returns Text with all key occurrences replaced.
 */
const redactKey = (text: string, apiKey: string | undefined): string => {
  if (!apiKey) return text
  return text.split(apiKey).join(REDACTED)
}

/**
 * Performs a GET request against the One Call endpoint and parses the
 * JSON response. The API key is stripped from any thrown error message.
 *
 * @param url - Fully-constructed URL including query parameters.
 * @param timeout - Request timeout in milliseconds.
 * @param apiKey - The active API key (used solely for redaction).
 * @returns Parsed One Call response.
 * @throws {Error} If the upstream returns a non-OK status, with the API
 *   key redacted from the message.
 */
const fetchJson = async (
  url: string,
  timeout: number,
  apiKey: string | undefined,
): Promise<OpenWeatherResponse> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(
        redactKey(`OpenWeather API request failed with status ${String(response.status)}`, apiKey),
      )
    }
    return (await response.json()) as OpenWeatherResponse
  } catch (error) {
    if (error instanceof Error) {
      // Re-wrap with a sanitized message so AbortError / fetch failure
      // text never leaks the key (e.g. "fetch failed: GET https://...&appid=...").
      throw new Error(redactKey(error.message, apiKey), { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds the common query string used by every One Call request.
 *
 * The caller supplies the `exclude` parameter to limit the response
 * payload to just the block(s) it needs (e.g. `'minutely,hourly,daily'`
 * for `getCurrent`).
 *
 * @param location - Caller-provided location.
 * @param apiKey - The effective API key.
 * @param exclude - Comma-separated list of blocks to exclude.
 * @returns A `URLSearchParams` populated with `lat`, `lon`, `appid`,
 *   `units=metric`, and `exclude`.
 */
const buildBaseParams = (
  location: WeatherLocation,
  apiKey: string,
  exclude: string,
): URLSearchParams => {
  return new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
    appid: apiKey,
    units: 'metric',
    exclude,
  })
}

/**
 * Sums the `1h` rain and snow accumulation blocks into a single total.
 *
 * @param rain - Optional rain block.
 * @param snow - Optional snow block.
 * @returns Total accumulation in millimetres.
 */
const sumPrecipitationHourly = (
  rain: { '1h'?: number } | undefined,
  snow: { '1h'?: number } | undefined,
): number => {
  return (rain?.['1h'] ?? 0) + (snow?.['1h'] ?? 0)
}

/**
 * Maps a One Call `current` block to a normalized {@link CurrentWeather}.
 *
 * @param current - One Call current block.
 * @returns Normalized current-weather reading.
 */
const mapCurrent = (current: OpenWeatherCurrent): CurrentWeather => {
  const wmoCode = owmCodeToWmoCode(current.weather[0]?.id ?? 800)
  return {
    time: new Date(current.dt * 1000),
    temperatureC: current.temp,
    feelsLikeC: current.feels_like,
    humidity: current.humidity,
    precipitationMm: sumPrecipitationHourly(current.rain, current.snow),
    wind: {
      speedKmh: current.wind_speed * MS_TO_KMH,
      directionDeg: current.wind_deg ?? null,
      ...(current.wind_gust == null ? {} : { gustKmh: current.wind_gust * MS_TO_KMH }),
    },
    code: wmoCode,
    summary: summarizeWmoCode(wmoCode),
  }
}

/**
 * Maps a One Call `hourly[i]` entry to a normalized
 * {@link HourlyForecast}.
 *
 * @param hourly - One Call hourly entry.
 * @returns Normalized hourly entry.
 */
const mapHourlyEntry = (hourly: OpenWeatherHourly): HourlyForecast => {
  const wmoCode = owmCodeToWmoCode(hourly.weather[0]?.id ?? 800)
  return {
    time: new Date(hourly.dt * 1000),
    temperatureC: hourly.temp,
    feelsLikeC: hourly.feels_like,
    humidity: hourly.humidity,
    precipitationMm: sumPrecipitationHourly(hourly.rain, hourly.snow),
    wind: {
      speedKmh: hourly.wind_speed * MS_TO_KMH,
      directionDeg: hourly.wind_deg ?? null,
      ...(hourly.wind_gust == null ? {} : { gustKmh: hourly.wind_gust * MS_TO_KMH }),
    },
    code: wmoCode,
    summary: summarizeWmoCode(wmoCode),
  }
}

/**
 * Maps a One Call `daily[i]` entry to a normalized
 * {@link DailyForecast}.
 *
 * Min/max apparent temperatures are derived from the four One Call
 * `feels_like` periods (morn / day / eve / night) since the API does
 * not expose explicit min/max values for that field.
 *
 * @param daily - One Call daily entry.
 * @returns Normalized daily entry.
 */
const mapDailyEntry = (daily: OpenWeatherDaily): DailyForecast => {
  const wmoCode = owmCodeToWmoCode(daily.weather[0]?.id ?? 800)
  const feelsLikePeriods = [
    daily.feels_like.morn,
    daily.feels_like.day,
    daily.feels_like.eve,
    daily.feels_like.night,
  ]
  return {
    date: new Date(daily.dt * 1000),
    temperatureMinC: daily.temp.min,
    temperatureMaxC: daily.temp.max,
    feelsLikeMinC: Math.min(...feelsLikePeriods),
    feelsLikeMaxC: Math.max(...feelsLikePeriods),
    humidity: daily.humidity,
    precipitationMm: (daily.rain ?? 0) + (daily.snow ?? 0),
    wind: {
      speedKmh: daily.wind_speed * MS_TO_KMH,
      directionDeg: daily.wind_deg ?? null,
      ...(daily.wind_gust == null ? {} : { gustKmh: daily.wind_gust * MS_TO_KMH }),
    },
    code: wmoCode,
    summary: summarizeWmoCode(wmoCode),
  }
}

/**
 * Synthesizes a {@link CurrentWeather} reading from the first hourly
 * entry when the response unexpectedly lacks a `current` block. Mirrors
 * the equivalent fallback in `@molecule/api-weather-open-meteo`.
 *
 * @param hourly - Hourly entries.
 * @returns Normalized current-weather reading derived from `hourly[0]`.
 * @throws {Error} If the hourly array is empty.
 */
const fallbackCurrentFromHourly = (hourly: OpenWeatherHourly[]): CurrentWeather => {
  const first = hourly[0]
  if (!first) {
    throw new Error('OpenWeather response contained neither a current nor an hourly block')
  }
  return mapHourlyEntry(first)
}

/**
 * Creates an OpenWeather (One Call API 3.0) weather provider.
 *
 * @param config - Provider configuration. `apiKey` is required at call
 *   time — either via this config or `OPENWEATHER_API_KEY` in the
 *   environment.
 * @returns A `WeatherProvider` backed by OpenWeather One Call 3.0.
 */
export const createProvider = (config: OpenWeatherConfig = {}): WeatherProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config.timeout ?? DEFAULT_TIMEOUT

  /**
   * Resolves the API key and throws a sanitized error if none is set.
   *
   * @returns The effective API key.
   */
  const requireApiKey = (): string => {
    const apiKey = resolveApiKey(config)
    if (!apiKey) {
      throw new Error(
        'OpenWeather API key is not configured. Set OPENWEATHER_API_KEY or pass `apiKey` to createProvider().',
      )
    }
    return apiKey
  }

  return {
    async getCurrent(location: WeatherLocation): Promise<CurrentWeather> {
      const apiKey = requireApiKey()
      const params = buildBaseParams(location, apiKey, 'minutely,hourly,daily')
      const url = `${baseUrl}/onecall?${params.toString()}`
      const data = await fetchJson(url, timeout, apiKey)
      if (data.current) {
        return mapCurrent(data.current)
      }
      if (data.hourly && data.hourly.length > 0) {
        return fallbackCurrentFromHourly(data.hourly)
      }
      throw new Error('OpenWeather response did not include a current weather block')
    },

    async getForecast(location: WeatherLocation, days?: number): Promise<DailyForecast[]> {
      const apiKey = requireApiKey()
      const requested = days ?? DEFAULT_FORECAST_DAYS
      const params = buildBaseParams(location, apiKey, 'current,minutely,hourly')
      const url = `${baseUrl}/onecall?${params.toString()}`
      const data = await fetchJson(url, timeout, apiKey)
      if (!data.daily) {
        return []
      }
      const limit = Math.min(requested, data.daily.length)
      const result: DailyForecast[] = []
      for (let i = 0; i < limit; i += 1) {
        const entry = data.daily[i]
        if (entry) {
          result.push(mapDailyEntry(entry))
        }
      }
      return result
    },

    async getHourly(location: WeatherLocation, hours?: number): Promise<HourlyForecast[]> {
      const apiKey = requireApiKey()
      const requested = hours ?? DEFAULT_HOURLY_HOURS
      const params = buildBaseParams(location, apiKey, 'current,minutely,daily')
      const url = `${baseUrl}/onecall?${params.toString()}`
      const data = await fetchJson(url, timeout, apiKey)
      if (!data.hourly) {
        return []
      }
      const limit = Math.min(requested, data.hourly.length)
      const result: HourlyForecast[] = []
      for (let i = 0; i < limit; i += 1) {
        const entry = data.hourly[i]
        if (entry) {
          result.push(mapHourlyEntry(entry))
        }
      }
      return result
    },
  }
}

/** Default provider instance, lazily initialized. */
let _provider: WeatherProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `OPENWEATHER_API_KEY` (and optionally `OPENWEATHER_BASE_URL`)
 * from the environment so application code can `bond('weather',
 * provider)` without writing any glue. If `OPENWEATHER_API_KEY` is
 * unset, the first method call throws a sanitized error pointing the
 * developer at the missing variable.
 */
export const provider: WeatherProvider = new Proxy({} as WeatherProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPENWEATHER_BASE_URL']
          ? { baseUrl: process.env['OPENWEATHER_BASE_URL'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
