/**
 * Nominatim (OpenStreetMap) geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using the Nominatim API for
 * geocoding, reverse geocoding, and place search (autocomplete). Distance
 * calculations use the Haversine formula. Timezone lookups are not supported.
 *
 * Nominatim is free and open-source but requires a `User-Agent` header per the
 * usage policy. For production use, consider hosting your own Nominatim instance
 * and configuring `baseUrl`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-geolocation'
 * import { provider } from '@molecule/api-geolocation-nominatim'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
