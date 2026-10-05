/**
 * Photon (OpenStreetMap) geolocation provider for molecule.dev.
 *
 * Implements the `GeolocationProvider` interface using a Photon instance for
 * geocoding, reverse geocoding, and search-as-you-type (autocomplete).
 * Distance calculations use the Haversine formula. Timezone lookups are not
 * supported.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-geolocation'
 * import { provider } from '@molecule/api-geolocation-photon'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Defaults to the public instance `https://photon.komoot.io`, which serves
 *   reasonable low-volume use only** — heavy usage is throttled or banned, with
 *   no availability guarantees. For production volume, run your own Photon
 *   (Apache-2.0, an OpenSearch-embedded Java 21 app with an OSM extract) and
 *   point `PHOTON_BASE_URL` (or `config.baseUrl`) at it.
 * - **Attribution is required by the data, not optional:** Photon serves
 *   OpenStreetMap data under ODbL — display "© OpenStreetMap contributors"
 *   wherever results appear.
 * - **Coverage is the loaded extract:** a self-hosted Photon answers only for
 *   the region its index was built from; queries outside it return `[]`, not
 *   an error. Build the index from the region your app actually geocodes.
 * - **No server-side country filter:** `countryCodes` filters results AFTER
 *   the query, so a restriction combined with a small limit can return fewer
 *   results than matched.
 * - **Results are as-typed-as-Photon-parsed them:** OSM data is community
 *   edited — treat a geocode result as a suggestion to confirm, never as a
 *   verified postal address (the same caution applies to every OSM geocoder).
 * - `getTimezone` is not implemented (optional core capability) — feature-
 *   detect per the core's remarks, or use `@molecule/api-geolocation-google`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
