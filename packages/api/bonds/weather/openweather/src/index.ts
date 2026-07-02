/**
 * OpenWeather (One Call API 3.0) weather provider for molecule.dev.
 *
 * Implements the `WeatherProvider` interface against
 * `https://api.openweathermap.org/data/3.0/onecall`. Suitable as a
 * paid-tier production alternative to `@molecule/api-weather-open-meteo`
 * — same normalized return types, same WMO 4677 weather codes (mapped
 * from OpenWeather's native condition codes), same metric units.
 *
 * The provider reads `OPENWEATHER_API_KEY` from the environment by
 * default. The key is redacted from any propagated error message.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-weather'
 * import { provider } from '@molecule/api-weather-openweather'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
