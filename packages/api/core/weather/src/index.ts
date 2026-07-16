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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Requesting weather for a real location (`getCurrent`) renders PLAUSIBLE
 *   current conditions in the UI — a temperature in a sane range (roughly -60
 *   to 60 °C), a non-empty `summary`/condition, plus the humidity (0–100) and
 *   wind the widget shows — never null, NaN, "--"/placeholder, or a hardcoded
 *   constant that never moves. Reload and confirm values track the provider.
 * - [ ] If a forecast is shown, `getForecast` returns MULTIPLE future days with
 *   DISTINCT values (min/max temps and codes vary day to day), and `getHourly`
 *   likewise — not one row repeated N times or every day identical.
 * - [ ] Changing the location changes the data: fetch two clearly different
 *   coordinates (e.g. a tropical vs. a polar city) and confirm the rendered
 *   current + forecast actually differ. Identical output for different lat/lon
 *   means the location never reached the provider.
 * - [ ] Units: the core normalizes everything to metric (Celsius, km/h, mm). If
 *   the UI offers a °F / imperial toggle it is an app-side conversion — flipping
 *   it must consistently convert EVERY displayed value (current, feels-like,
 *   forecast min/max, wind) while the fetched data stays metric; no half-
 *   converted mix (a °C label over an °F number, or wind left in km/h).
 * - [ ] An unknown place name (if the app geocodes) or out-of-range coordinates
 *   surfaces a clear "not found" — not a blank widget — and a provider outage or
 *   rate-limit (429) surfaces a graceful message that leaves the last-known
 *   reading or an empty state. The app never crashes, spins forever, or shows
 *   NaN/undefined.
 * - [ ] The provider API key (if the bonded provider needs one) stays server-
 *   side — never shipped to the browser or a client bundle — and the weather
 *   endpoint is not an open unbounded proxy: it accepts only the app's own
 *   locations, not arbitrary caller-supplied upstream URLs or keys.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
