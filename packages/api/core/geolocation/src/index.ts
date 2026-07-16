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
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
