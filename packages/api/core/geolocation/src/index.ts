/**
 * Provider-agnostic geolocation interface for molecule.dev.
 *
 * Defines the `GeolocationProvider` interface for geocoding addresses, reverse geocoding
 * coordinates, calculating distances, autocomplete suggestions, and timezone lookups.
 * Bond packages (Google Maps, Mapbox, Nominatim, etc.) implement this interface. Application
 * code uses the convenience functions (`geocode`, `reverseGeocode`, `distance`, `autocomplete`,
 * `getTimezone`) which delegate to the bonded provider.
 *
 * @remarks
 * - **`autocomplete` and `getTimezone` are OPTIONAL provider capabilities.** The
 *   convenience wrappers THROW when the bonded provider doesn't implement them
 *   (e.g. Mapbox and Nominatim expose no timezone API). Before building a screen
 *   on either, confirm the chosen bond implements it — don't assume every
 *   provider matches the fullest one's surface.
 * - **`distance()` still requires a bonded provider**, even though it's a pure
 *   Haversine calculation with no API call — with nothing bonded it throws the
 *   same "no provider" error as the network methods.
 * - `geocode()`/`reverseGeocode()` return an ARRAY (possibly empty) — never assume
 *   `[0]` exists; an empty array means "not found", not an error.
 * - `distance()` returns KILOMETRES unless you pass `'mi'`; it is not metres.
 * - Geocoding calls are metered third-party requests: debounce autocomplete
 *   input and persist geocoded coordinates alongside the stored address instead
 *   of re-geocoding on every read/render.
 * - API keys are bond-specific config and stay SERVER-SIDE (see the bonded
 *   package's docs for its exact env var names) — never expose a geocoding key
 *   through app code; app screens call YOUR API, which calls this.
 *
 * @example
 * ```typescript
 * import { distance, geocode, reverseGeocode, setProvider } from '@molecule/api-geolocation'
 * import { createProvider } from '@molecule/api-geolocation-nominatim'
 *
 * // Startup (server only): bond one provider. Nominatim is keyless but REQUIRES an
 * // identifying User-Agent (swap to `@molecule/api-geolocation-google` for timezones).
 * setProvider(
 *   createProvider({
 *     userAgent: process.env.NOMINATIM_USER_AGENT ?? 'acme-stores/1.0 (ops@acme.example)',
 *     email: process.env.NOMINATIM_EMAIL,
 *   }),
 * )
 *
 * // Geocode once when the address is saved; persist lat/lng with it.
 * const [store] = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
 * if (!store) throw new Error('Address not found')
 *
 * // Reverse-geocode a device position into a human-readable address.
 * const [here] = await reverseGeocode(37.3861, -122.0839)
 *
 * // Pure Haversine distance (kilometres by default, pass 'mi' for miles).
 * const km = distance({ lat: here?.lat ?? 37.3861, lng: here?.lng ?? -122.0839 }, store)
 * const miles = distance({ lat: 37.3861, lng: -122.0839 }, store, 'mi')
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A known input resolves to plausibly-correct results: a real address
 *   passed to `geocode()` returns coordinates in roughly the right place (a
 *   famous landmark lands inside its own city, not the middle of the ocean),
 *   and a known lat/lng passed to `reverseGeocode()` names the right city —
 *   never an empty array, `null`, `0,0`, or a hardcoded placeholder.
 * - [ ] The app actually CONSUMES the result downstream, verified on screen:
 *   the map recenters on the geocoded point, a "near me" list is sorted or
 *   filtered by `distance()` (closest first), or the address form marks a real
 *   address valid and a bogus one invalid — a coordinate that comes back but
 *   changes nothing in the UI is a broken integration, not a pass.
 * - [ ] If the app relies on the BROWSER geolocation permission, denying it
 *   (or letting it time out) falls back gracefully to manual entry — type or
 *   autocomplete an address — never a blank map, a spinner that never
 *   resolves, or a crash.
 * - [ ] An unresolvable input (gibberish address, empty `geocode()`/
 *   `reverseGeocode()` result) surfaces a clear "location not found" message,
 *   not a crash, a silent blank screen, or a default location shown as if real.
 * - [ ] PRIVACY: a user's precise coordinates are not exposed to other users
 *   or written to logs beyond what the feature needs (persist/show only the
 *   granularity required — e.g. city, not raw lat/lng), and the geocoding
 *   provider key stays SERVER-SIDE (app screens call YOUR API, never the
 *   geocoding service directly).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
