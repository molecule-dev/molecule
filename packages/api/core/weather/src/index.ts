/**
 * Provider-agnostic weather data interface for molecule.dev.
 *
 * Defines the `WeatherProvider` interface for current observations, daily
 * forecasts, and hourly forecasts. Bond packages (Open-Meteo, OpenWeather,
 * NWS, etc.) implement this interface. Application code uses the convenience
 * functions (`getCurrent`, `getForecast`, `getHourly`) which delegate to the
 * bonded provider.
 *
 * Values are normalized to metric units: temperature in degrees Celsius,
 * precipitation in millimetres, wind in kilometres per hour, humidity as
 * percent (0–100). Condition codes follow WMO 4677 — providers that speak
 * a different vocabulary MUST translate before returning.
 *
 * @example
 * ```typescript
 * import { setProvider, getCurrent, getForecast } from '@molecule/api-weather'
 * import { provider as openMeteo } from '@molecule/api-weather-open-meteo'
 *
 * setProvider(openMeteo)
 * const now = await getCurrent({ lat: 40.7128, lon: -74.006 })
 * const week = await getForecast({ lat: 40.7128, lon: -74.006 }, 7)
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
