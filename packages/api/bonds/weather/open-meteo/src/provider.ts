/**
 * Open-Meteo implementation of WeatherProvider.
 *
 * Wraps the public `https://api.open-meteo.com/v1/forecast` endpoint, which
 * is keyless, free for non-commercial use, and emits WMO 4677 weather codes
 * directly. Open-Meteo's native units already match the core interface
 * (Celsius, mm, km/h, percent), so the mapping is a structural reshape
 * rather than a unit conversion.
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

import type { OpenMeteoWeatherConfig } from './types.js'

/** Default Open-Meteo public forecast endpoint base URL. */
const DEFAULT_BASE_URL = 'https://api.open-meteo.com/v1'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default forecast-day count when the caller omits `days`. */
const DEFAULT_FORECAST_DAYS = 7

/** Default hourly-forecast hour count when the caller omits `hours`. */
const DEFAULT_HOURLY_HOURS = 24

/**
 * Hourly variables requested for both the "current" reading (we use the
 * first hour as the present-time observation when Open-Meteo's `current`
 * block is unavailable) and for `getHourly`.
 */
const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
] as const

/**
 * Daily variables requested for `getForecast`. Open-Meteo aggregates
 * hourly data into these daily summaries server-side.
 */
const DAILY_VARS = [
  'temperature_2m_min',
  'temperature_2m_max',
  'apparent_temperature_min',
  'apparent_temperature_max',
  'relative_humidity_2m_mean',
  'precipitation_sum',
  'wind_speed_10m_max',
  'wind_direction_10m_dominant',
  'wind_gusts_10m_max',
  'weather_code',
] as const

/**
 * Variables requested in the `current` block for `getCurrent`.
 */
const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
] as const

/**
 * Open-Meteo `current` block shape. All fields are scalar — this represents
 * the present-time observation Open-Meteo returns when the `current` query
 * parameter is set.
 */
interface OpenMeteoCurrent {
  /** ISO 8601 timestamp the reading applies to. */
  time: string
  /** Air temperature, °C. */
  temperature_2m: number
  /** Apparent ("feels like") temperature, °C. */
  apparent_temperature: number
  /** Relative humidity, percent (0–100). */
  relative_humidity_2m: number
  /** Precipitation accumulated over the reporting interval, mm. */
  precipitation: number
  /** Wind speed at 10 m, km/h. */
  wind_speed_10m: number
  /** Wind direction at 10 m, compass degrees. */
  wind_direction_10m: number | null
  /** Wind gust speed at 10 m, km/h. */
  wind_gusts_10m: number | null
  /** WMO 4677 weather code. */
  weather_code: number
}

/**
 * Open-Meteo `hourly` block shape. Each field is an array indexed by hour.
 */
interface OpenMeteoHourly {
  /** ISO 8601 hour timestamps. */
  time: string[]
  /** Hourly air temperature, °C. */
  temperature_2m: number[]
  /** Hourly apparent temperature, °C. */
  apparent_temperature: number[]
  /** Hourly relative humidity, percent (0–100). */
  relative_humidity_2m: number[]
  /** Hourly precipitation, mm. */
  precipitation: number[]
  /** Hourly wind speed at 10 m, km/h. */
  wind_speed_10m: number[]
  /** Hourly wind direction at 10 m, compass degrees. */
  wind_direction_10m: (number | null)[]
  /** Hourly wind gust speed, km/h. */
  wind_gusts_10m: (number | null)[]
  /** Hourly WMO 4677 weather code. */
  weather_code: number[]
}

/**
 * Open-Meteo `daily` block shape. Each field is an array indexed by day.
 */
interface OpenMeteoDaily {
  /** ISO 8601 date strings (one per forecast day). */
  time: string[]
  /** Daily minimum temperature, °C. */
  temperature_2m_min: number[]
  /** Daily maximum temperature, °C. */
  temperature_2m_max: number[]
  /** Daily minimum apparent temperature, °C. */
  apparent_temperature_min: number[]
  /** Daily maximum apparent temperature, °C. */
  apparent_temperature_max: number[]
  /** Daily mean relative humidity, percent (0–100). */
  relative_humidity_2m_mean: number[]
  /** Daily total precipitation, mm. */
  precipitation_sum: number[]
  /** Daily maximum wind speed, km/h. */
  wind_speed_10m_max: number[]
  /** Daily dominant wind direction, compass degrees. */
  wind_direction_10m_dominant: (number | null)[]
  /** Daily maximum wind gust speed, km/h. */
  wind_gusts_10m_max: (number | null)[]
  /** Daily representative WMO 4677 weather code. */
  weather_code: number[]
}

/**
 * Top-level shape of a `/v1/forecast` response.
 */
interface OpenMeteoResponse {
  /** Latitude actually used (may differ slightly from request due to grid snap). */
  latitude: number
  /** Longitude actually used. */
  longitude: number
  /** IANA timezone the timestamps are quoted in. */
  timezone?: string
  /** Current conditions block. */
  current?: OpenMeteoCurrent
  /** Hourly forecast block. */
  hourly?: OpenMeteoHourly
  /** Daily forecast block. */
  daily?: OpenMeteoDaily
}

/**
 * Maps a WMO 4677 numeric weather code to a short English summary.
 *
 * The mapping covers the codes Open-Meteo emits. Unknown codes fall back
 * to a generic `'Unknown'` label so summary always returns a non-empty
 * string.
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
 * Performs a GET request against the Open-Meteo forecast endpoint and
 * parses the JSON response.
 *
 * @param url - Fully-constructed URL including query parameters.
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed Open-Meteo response.
 * @throws {Error} If the upstream returns a non-OK status.
 */
const fetchJson = async (url: string, timeout: number): Promise<OpenMeteoResponse> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Open-Meteo API request failed with status ${String(response.status)}`)
    }
    return (await response.json()) as OpenMeteoResponse
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds the common query parameters used by every endpoint call.
 *
 * @param config - Provider configuration.
 * @param location - Caller-provided location.
 * @returns A `URLSearchParams` populated with `latitude`, `longitude`,
 *   `timezone`, and (when configured) `apikey`.
 */
const buildBaseParams = (
  config: OpenMeteoWeatherConfig,
  location: WeatherLocation,
): URLSearchParams => {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    timezone: location.timezone ?? config.defaultTimezone ?? 'auto',
  })
  if (config.apiKey) {
    params.set('apikey', config.apiKey)
  }
  return params
}

/**
 * Maps an Open-Meteo `current` block to a normalized {@link CurrentWeather}.
 *
 * @param current - Open-Meteo current block.
 * @returns Normalized current-weather reading.
 */
const mapCurrent = (current: OpenMeteoCurrent): CurrentWeather => ({
  time: new Date(current.time),
  temperatureC: current.temperature_2m,
  feelsLikeC: current.apparent_temperature,
  humidity: current.relative_humidity_2m,
  precipitationMm: current.precipitation,
  wind: {
    speedKmh: current.wind_speed_10m,
    directionDeg: current.wind_direction_10m,
    ...(current.wind_gusts_10m == null ? {} : { gustKmh: current.wind_gusts_10m }),
  },
  code: current.weather_code,
  summary: summarizeWmoCode(current.weather_code),
})

/**
 * Maps an Open-Meteo `hourly` block to an array of normalized
 * {@link HourlyForecast} entries.
 *
 * @param hourly - Open-Meteo hourly block.
 * @param hours - Maximum number of entries to return.
 * @returns Array of normalized hourly entries, sliced to `hours`.
 */
const mapHourly = (hourly: OpenMeteoHourly, hours: number): HourlyForecast[] => {
  const limit = Math.min(hours, hourly.time.length)
  const result: HourlyForecast[] = []
  for (let i = 0; i < limit; i += 1) {
    const code = hourly.weather_code[i]
    const gust = hourly.wind_gusts_10m[i]
    result.push({
      time: new Date(hourly.time[i]),
      temperatureC: hourly.temperature_2m[i],
      feelsLikeC: hourly.apparent_temperature[i],
      humidity: hourly.relative_humidity_2m[i],
      precipitationMm: hourly.precipitation[i],
      wind: {
        speedKmh: hourly.wind_speed_10m[i],
        directionDeg: hourly.wind_direction_10m[i],
        ...(gust == null ? {} : { gustKmh: gust }),
      },
      code,
      summary: summarizeWmoCode(code),
    })
  }
  return result
}

/**
 * Maps an Open-Meteo `daily` block to an array of normalized
 * {@link DailyForecast} entries.
 *
 * @param daily - Open-Meteo daily block.
 * @param days - Maximum number of entries to return.
 * @returns Array of normalized daily entries, sliced to `days`.
 */
const mapDaily = (daily: OpenMeteoDaily, days: number): DailyForecast[] => {
  const limit = Math.min(days, daily.time.length)
  const result: DailyForecast[] = []
  for (let i = 0; i < limit; i += 1) {
    const code = daily.weather_code[i]
    const gust = daily.wind_gusts_10m_max[i]
    result.push({
      date: new Date(daily.time[i]),
      temperatureMinC: daily.temperature_2m_min[i],
      temperatureMaxC: daily.temperature_2m_max[i],
      feelsLikeMinC: daily.apparent_temperature_min[i],
      feelsLikeMaxC: daily.apparent_temperature_max[i],
      humidity: daily.relative_humidity_2m_mean[i],
      precipitationMm: daily.precipitation_sum[i],
      wind: {
        speedKmh: daily.wind_speed_10m_max[i],
        directionDeg: daily.wind_direction_10m_dominant[i],
        ...(gust == null ? {} : { gustKmh: gust }),
      },
      code,
      summary: summarizeWmoCode(code),
    })
  }
  return result
}

/**
 * Synthesizes a {@link CurrentWeather} reading from the first hourly entry
 * when Open-Meteo's `current` block is unavailable.
 *
 * @param hourly - Open-Meteo hourly block.
 * @returns Normalized current-weather reading derived from hour 0.
 * @throws {Error} If the hourly block is empty.
 */
const fallbackCurrentFromHourly = (hourly: OpenMeteoHourly): CurrentWeather => {
  if (hourly.time.length === 0) {
    throw new Error('Open-Meteo response contained neither a current nor an hourly block')
  }
  const code = hourly.weather_code[0]
  const gust = hourly.wind_gusts_10m[0]
  return {
    time: new Date(hourly.time[0]),
    temperatureC: hourly.temperature_2m[0],
    feelsLikeC: hourly.apparent_temperature[0],
    humidity: hourly.relative_humidity_2m[0],
    precipitationMm: hourly.precipitation[0],
    wind: {
      speedKmh: hourly.wind_speed_10m[0],
      directionDeg: hourly.wind_direction_10m[0],
      ...(gust == null ? {} : { gustKmh: gust }),
    },
    code,
    summary: summarizeWmoCode(code),
  }
}

/**
 * Creates an Open-Meteo weather provider.
 *
 * @param config - Provider configuration. All fields are optional.
 * @returns A `WeatherProvider` backed by the Open-Meteo forecast API.
 */
export const createProvider = (config: OpenMeteoWeatherConfig = {}): WeatherProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config.timeout ?? DEFAULT_TIMEOUT

  return {
    async getCurrent(location: WeatherLocation): Promise<CurrentWeather> {
      const params = buildBaseParams(config, location)
      params.set('current', CURRENT_VARS.join(','))
      const url = `${baseUrl}/forecast?${params.toString()}`
      const data = await fetchJson(url, timeout)
      if (data.current) {
        return mapCurrent(data.current)
      }
      if (data.hourly) {
        return fallbackCurrentFromHourly(data.hourly)
      }
      throw new Error('Open-Meteo response did not include a current weather block')
    },

    async getForecast(location: WeatherLocation, days?: number): Promise<DailyForecast[]> {
      const requested = days ?? DEFAULT_FORECAST_DAYS
      const params = buildBaseParams(config, location)
      params.set('daily', DAILY_VARS.join(','))
      params.set('forecast_days', String(requested))
      const url = `${baseUrl}/forecast?${params.toString()}`
      const data = await fetchJson(url, timeout)
      if (!data.daily) {
        return []
      }
      return mapDaily(data.daily, requested)
    },

    async getHourly(location: WeatherLocation, hours?: number): Promise<HourlyForecast[]> {
      const requested = hours ?? DEFAULT_HOURLY_HOURS
      const params = buildBaseParams(config, location)
      params.set('hourly', HOURLY_VARS.join(','))
      // Open-Meteo's `forecast_hours` rounds up to whole days server-side,
      // so we request enough days to cover the requested hour count and
      // slice locally.
      const days = Math.max(1, Math.ceil(requested / 24))
      params.set('forecast_days', String(days))
      const url = `${baseUrl}/forecast?${params.toString()}`
      const data = await fetchJson(url, timeout)
      if (!data.hourly) {
        return []
      }
      return mapHourly(data.hourly, requested)
    },
  }
}

/** Default provider instance, lazily initialized. */
let _provider: WeatherProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `OPEN_METEO_BASE_URL` and `OPEN_METEO_API_KEY` from environment
 * variables for optional self-hosted or commercial endpoints. The public
 * Open-Meteo service requires neither.
 */
export const provider: WeatherProvider = new Proxy({} as WeatherProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPEN_METEO_BASE_URL']
          ? { baseUrl: process.env['OPEN_METEO_BASE_URL'] }
          : {}),
        ...(process.env['OPEN_METEO_API_KEY'] ? { apiKey: process.env['OPEN_METEO_API_KEY'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPEN_METEO_BASE_URL']
          ? { baseUrl: process.env['OPEN_METEO_BASE_URL'] }
          : {}),
        ...(process.env['OPEN_METEO_API_KEY'] ? { apiKey: process.env['OPEN_METEO_API_KEY'] } : {}),
      })
    }
    return Reflect.set(_provider, prop, value)
  },
})
