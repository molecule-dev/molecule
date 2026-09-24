/**
 * Google Maps geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using Google Maps Geocoding,
 * Places Autocomplete, and Timezone APIs. Supports geocoding, reverse geocoding,
 * Haversine distance calculations, place autocomplete, and timezone lookups.
 *
 * @example
 * ```typescript
 * import { distance, geocode, getTimezone, setProvider } from '@molecule/api-geolocation'
 * import { createProvider } from '@molecule/api-geolocation-google'
 *
 * // Startup: bond once. Key needs the Geocoding (+ Places / Time Zone) APIs enabled.
 * const apiKey = process.env.GOOGLE_MAPS_API_KEY
 * if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not set')
 * setProvider(createProvider({ apiKey, language: 'en', region: 'us' }))
 *
 * const [office] = await geocode('1600 Amphitheatre Parkway, Mountain View, CA') // [] = not found
 * if (office) {
 *   const km = distance(office, { lat: 37.7749, lng: -122.4194 }) // KILOMETRES to San Francisco
 *   const tz = await getTimezone(office.lat, office.lng) // { timeZoneId: 'America/Los_Angeles', … }
 *   console.log(office.formattedAddress, office.components.postalCode, Math.round(km), tz.timeZoneId)
 * }
 * ```
 *
 * @remarks
 * - **Bond through the core**: `setProvider(...)` from `@molecule/api-geolocation`, then call
 *   the core's `geocode` / `reverseGeocode` / `distance` / `autocomplete` / `getTimezone`.
 * - `createProvider()` REQUIRES `apiKey` (it does not read the environment); only the lazy
 *   `provider` export reads `GOOGLE_MAPS_API_KEY` (and `GOOGLE_MAPS_BASE_URL`), throwing on
 *   first use when it is unset.
 * - Google answers errors with HTTP 200 and a `status` field — `REQUEST_DENIED` (API not
 *   enabled / key restricted), `OVER_QUERY_LIMIT`, `INVALID_REQUEST` all throw an `Error`
 *   naming that status. `ZERO_RESULTS` is NOT an error: you get `[]`.
 * - `autocomplete()` uses the legacy Places Autocomplete endpoint and returns no `location`
 *   on suggestions — geocode the chosen suggestion's text to get coordinates. `limit` is
 *   applied client-side.
 * - `getTimezone()` offsets are SECONDS (`rawOffset` + `dstOffset`), evaluated at the current
 *   time. `distance()` is local Haversine math (no request); `timeout` is milliseconds.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
