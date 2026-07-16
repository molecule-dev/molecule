/**
 * Nominatim (OpenStreetMap) geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using the Nominatim API for
 * geocoding, reverse geocoding, and place search (autocomplete). Distance
 * calculations use the Haversine formula. Timezone lookups are not supported.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-geolocation'
 * import { provider } from '@molecule/api-geolocation-nominatim'
 *
 * setProvider(provider)
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
