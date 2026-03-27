/**
 * Google Maps geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using Google Maps Geocoding,
 * Places Autocomplete, and Timezone APIs. Supports geocoding, reverse geocoding,
 * Haversine distance calculations, place autocomplete, and timezone lookups.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-geolocation'
 * import { provider } from '@molecule/api-geolocation-google'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
