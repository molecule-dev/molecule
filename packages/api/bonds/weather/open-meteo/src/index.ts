/**
 * Open-Meteo weather provider for molecule.dev.
 *
 * Implements the `WeatherProvider` interface against the public Open-Meteo
 * forecast endpoint (`https://api.open-meteo.com/v1/forecast`), which is
 * keyless, free for non-commercial use, and emits WMO 4677 weather codes
 * directly. Open-Meteo's native units (Celsius, mm, km/h, percent) already
 * match the core interface, so the provider performs a structural reshape
 * rather than a unit conversion.
 *
 * @remarks
 * - **Wire it through the core's `setProvider()`** from `@molecule/api-weather` (not
 *   `bond('weather-open-meteo', ...)`), then call the core's `getCurrent()` /
 *   `getForecast(location, days)` / `getHourly(location, hours)`.
 * - **No API key is needed** for the public endpoint — do not invent an `OPEN_METEO_API_KEY`
 *   secret. The public service is free for NON-COMMERCIAL use only; commercial apps set
 *   `OPEN_METEO_API_KEY` (+ `OPEN_METEO_BASE_URL=https://customer-api.open-meteo.com/v1`),
 *   which the exported `provider` reads lazily on first use.
 * - **Locations are `{ lat, lon }`** (not `latitude`/`longitude`, not a city name — geocode
 *   first). `timezone` defaults to `'auto'` (the location's local zone).
 * - Units are fixed: °C, mm, km/h, percent — there is no imperial option; convert in the UI.
 *   `getForecast()` defaults to 7 days, `getHourly()` to 24 hours. `summary` is English and
 *   developer-facing — translate `code` (WMO 4677) for user-visible text.
 * - A non-2xx response throws `Open-Meteo API request failed with status <n>`; requests time
 *   out after 10 s (`createProvider({ timeout })` in milliseconds).
 *
 * @example
 * ```typescript
 * import { getCurrent, getForecast, setProvider } from '@molecule/api-weather'
 * import { provider as openMeteo } from '@molecule/api-weather-open-meteo'
 *
 * // Startup. Keyless — no env vars needed for the public (non-commercial) endpoint.
 * setProvider(openMeteo)
 *
 * const berlin = { lat: 52.52, lon: 13.405, timezone: 'Europe/Berlin' } // lat/lon, not a city name
 *
 * const now = await getCurrent(berlin)
 * // { time: Date, temperatureC: 18.4, feelsLikeC: 17.9, humidity: 62, precipitationMm: 0,
 * //   wind: { speedKmh: 11.2, directionDeg: 240 }, code: 2, summary: 'Partly cloudy' }
 *
 * const nextThreeDays = await getForecast(berlin, 3) // DailyForecast[] (temperatureMinC/MaxC, …)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
