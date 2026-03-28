/**
 * Mapbox geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using Mapbox Geocoding API v6
 * and Search Box API v1. Supports geocoding, reverse geocoding, Haversine distance
 * calculations, and place autocomplete. Timezone lookups are not supported by Mapbox.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-geolocation'
 * import { provider } from '@molecule/api-geolocation-mapbox'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
