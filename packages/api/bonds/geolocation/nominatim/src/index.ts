/**
 * Nominatim (OpenStreetMap) geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using the Nominatim API for
 * geocoding, reverse geocoding, and place search (autocomplete). Distance
 * calculations use the Haversine formula. Timezone lookups are not supported.
 *
 * @example
 * ```typescript
 * import { distance, geocode, reverseGeocode, setProvider } from '@molecule/api-geolocation'
 * import { createProvider } from '@molecule/api-geolocation-nominatim'
 *
 * // Startup: bond once. Keyless, but the User-Agent MUST identify your app.
 * setProvider(
 *   createProvider({
 *     userAgent: process.env.NOMINATIM_USER_AGENT ?? 'acme-stores/1.0 (ops@acme.example)',
 *     email: process.env.NOMINATIM_EMAIL,
 *     countryCodes: ['gb'], // ISO 3166-1 alpha-2
 *     limit: 5,
 *   }),
 * )
 *
 * const [store] = await geocode('10 Downing Street, London') // [] = not found
 * if (store) {
 *   const [here] = await reverseGeocode(51.5007, -0.1246) // lat, lng
 *   const miles = distance(store, { lat: 51.5007, lng: -0.1246 }, 'mi') // default unit is km
 *   console.log(store.components.postalCode, here?.formattedAddress, miles.toFixed(2))
 * }
 * ```
 *
 * @remarks
 * - **The public `nominatim.openstreetmap.org` server enforces a strict usage
 *   policy: max 1 request/second, no autocomplete-as-you-type, and an
 *   identifying User-Agent.** Debounce `autocomplete()` aggressively (or
 *   trigger it on submit, not keystrokes), set `NOMINATIM_USER_AGENT` to a
 *   string that identifies YOUR app (the `'molecule-app'` default is not
 *   compliant for production), and set `NOMINATIM_EMAIL` as the policy
 *   contact. Violations get the app's traffic blocked.
 * - For production volume, self-host Nominatim and point `NOMINATIM_BASE_URL`
 *   (or `config.baseUrl`) at it — the public-server limits then don't apply.
 * - `getTimezone` is not implemented (optional core capability) — feature-
 *   detect per the core's remarks, or use `@molecule/api-geolocation-google`.
 * - **This bond does NOT throttle or cache.** Every call is one HTTP request;
 *   staying under 1 request/second on the public server is the caller's job
 *   (queue geocodes, store the coordinates with the address).
 * - `createProvider()` REQUIRES `userAgent` and does not read the environment;
 *   only the lazy `provider` export reads `NOMINATIM_USER_AGENT`,
 *   `NOMINATIM_EMAIL` and `NOMINATIM_BASE_URL`.
 * - `reverseGeocode()` returns `[]` (not an error) when nothing is there;
 *   non-2xx responses throw `Nominatim API request failed with status N`.
 *   `placeId` is Nominatim's numeric `place_id` as a string — it is not stable
 *   across Nominatim data updates, so don't persist it as a key.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
