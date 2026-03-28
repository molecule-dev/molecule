/**
 * Provider-agnostic geolocation interface for molecule.dev.
 *
 * Defines the `GeolocationProvider` interface for geocoding addresses, reverse geocoding
 * coordinates, calculating distances, autocomplete suggestions, and timezone lookups.
 * Bond packages (Google Maps, Mapbox, Nominatim, etc.) implement this interface. Application
 * code uses the convenience functions (`geocode`, `reverseGeocode`, `distance`, `autocomplete`,
 * `getTimezone`) which delegate to the bonded provider.
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
export * from './types.js'

// Provider exports
export * from './provider.js'
