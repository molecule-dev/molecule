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
 * - Geocoding calls are metered third-party requests: debounce autocomplete
 *   input and persist geocoded coordinates alongside the stored address instead
 *   of re-geocoding on every read/render.
 * - API keys are bond-specific config and stay SERVER-SIDE (see the bonded
 *   package's docs for its exact env var names) — never expose a geocoding key
 *   through app code; app screens call YOUR API, which calls this.
 *
 * @example
 * ```typescript
 * import { setProvider, geocode, reverseGeocode, distance } from '@molecule/api-geolocation'
 * import { provider as google } from '@molecule/api-geolocation-google'
 *
 * setProvider(google)
 * const results = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
 * const addresses = await reverseGeocode(37.4224764, -122.0842499)
 * const km = distance({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 })
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
