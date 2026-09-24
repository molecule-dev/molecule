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
 * @remarks
 * - **Wire it through the core's `setProvider()`** from `@molecule/api-weather` (not
 *   `bond('weather-openweather', ...)`), then call the core's `getCurrent()` /
 *   `getForecast(location, days)` / `getHourly(location, hours)`.
 * - **This is One Call API 3.0**, which OpenWeather bills separately ("One Call by Call"
 *   subscription). A key without that subscription gets a 401 — surfaced as
 *   `OpenWeather API request failed with status 401`, not a config error.
 * - **The key is checked at CALL time, not at bond time:** with no `apiKey` option and no
 *   `OPENWEATHER_API_KEY`, every call throws `OpenWeather API key is not configured…`.
 * - **Locations are `{ lat, lon }`** — no city names (geocode first). `location.timezone` is
 *   IGNORED by this bond; times are absolute `Date`s from OpenWeather's unix timestamps.
 * - Units are metric: °C, mm, and wind in km/h (converted from OpenWeather's m/s). Weather
 *   codes are mapped onto WMO 4677, so `code` matches the Open-Meteo bond. `summary` is
 *   English and developer-facing — translate `code` for user-visible text.
 *
 * @example
 * ```typescript
 * import { getCurrent, getForecast, setProvider } from '@molecule/api-weather'
 * import { createProvider } from '@molecule/api-weather-openweather'
 *
 * // Startup. Env: OPENWEATHER_API_KEY (an account with the One Call API 3.0 subscription).
 * setProvider(createProvider({ apiKey: process.env.OPENWEATHER_API_KEY }))
 *
 * const london = { lat: 51.5072, lon: -0.1276 } // lat/lon, not a city name
 *
 * const now = await getCurrent(london)
 * // { time: Date, temperatureC: 16.2, feelsLikeC: 15.8, humidity: 72, precipitationMm: 0.4,
 * //   wind: { speedKmh: 18, directionDeg: 230 }, code: 61, summary: 'Light rain' }
 *
 * const week = await getForecast(london) // DailyForecast[] — 7 days by default
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
