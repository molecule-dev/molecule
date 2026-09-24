/**
 * Mapbox geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using Mapbox Geocoding API v6
 * and Search Box API v1. Supports geocoding, reverse geocoding, Haversine distance
 * calculations, and place autocomplete. Timezone lookups are not supported by Mapbox.
 *
 * @example
 * ```typescript
 * import { randomUUID } from 'node:crypto'
 *
 * import { autocomplete, geocode, setProvider } from '@molecule/api-geolocation'
 * import { createProvider } from '@molecule/api-geolocation-mapbox'
 *
 * // Startup: bond once. Token from https://account.mapbox.com/access-tokens (server-side).
 * const accessToken = process.env.MAPBOX_ACCESS_TOKEN
 * if (!accessToken) throw new Error('MAPBOX_ACCESS_TOKEN is not set')
 * setProvider(createProvider({ accessToken, language: 'en', country: 'us' }))
 *
 * const [place] = await geocode('1600 Pennsylvania Ave NW, Washington, DC') // [] = not found
 * console.log(place?.lat, place?.lng, place?.components.postalCode) // 38.8977 -77.0365 '20500'
 *
 * // Typeahead: reuse ONE session token for the keystrokes of a single search.
 * const sessionToken = randomUUID()
 * const suggestions = await autocomplete('1600 Penn', { sessionToken, limit: 5 })
 * console.log(suggestions.map((s) => s.description))
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-geolocation`, then call
 *   the core's `geocode` / `reverseGeocode` / `distance` / `autocomplete`.
 * - **No `getTimezone()`** — Mapbox has no timezone API, so the core's `getTimezone()` THROWS
 *   with this bond. Use `@molecule/api-geolocation-google` if you need it.
 * - `createProvider()` REQUIRES `accessToken` (it does not read the environment); only the
 *   lazy `provider` export reads `MAPBOX_ACCESS_TOKEN` (and `MAPBOX_BASE_URL`).
 * - `autocomplete()` calls the Search Box `/suggest` endpoint: pass a `sessionToken` (Mapbox
 *   bills and groups suggest calls by session), `limit` is capped at 10, and suggestions carry
 *   no coordinates — geocode the chosen `description` to get them.
 * - `country` is an ISO 3166 alpha-2 code (`'us'`), applied to geocode and (unless the call
 *   passes `countries`) autocomplete. Any non-2xx response throws
 *   `Mapbox API request failed with status N` (401 = bad token, 429 = rate limited).
 *   `timeout` is milliseconds.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
