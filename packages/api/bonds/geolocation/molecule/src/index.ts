/**
 * molecule.dev hosted geocoding provider for `@molecule/api-geolocation`.
 *
 * Geocodes addresses and reverse-geocodes coordinates on molecule.dev and
 * bills the lookups to your molecule project, so the app needs no maps-vendor
 * account. It is an ordinary bond: swap it for `@molecule/api-geolocation-google`
 * (your own key) or a self-hosted `@molecule/api-geolocation-photon` without
 * changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, geocode, reverseGeocode } from '@molecule/api-geolocation'
 * import { provider as geocoding } from '@molecule/api-geolocation-molecule'
 *
 * setProvider(geocoding) // reads MOLECULE_API_KEY from the environment
 *
 * const results = await geocode('Bahnhofstrasse, Vaduz')
 * const addresses = await reverseGeocode(47.1411, 9.5215)
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:maps`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Addresses are capped at 300 characters; lat/lng must be finite and in
 *   range — bad calls are refused locally with 400/413 and never leave the
 *   process.
 * - `autocomplete` and `getTimezone` are NOT implemented: the hosted service
 *   serves the core's `geocode`/`reverseGeocode` pair (feature-detect per the
 *   core's remarks; use the Google bond when you need both).
 * - **Coverage is the region molecule's geocoder has loaded** (an OpenStreetMap
 *   extract; grow region by region). A query outside it returns `[]` — handle
 *   the empty array as "not found", not as an error. Results carry
 *   OpenStreetMap data: display "© OpenStreetMap contributors" wherever they
 *   appear, and treat them as suggestions to confirm, not verified addresses.
 * - Metered per request and billed to the project; molecule's own
 *   infrastructure serves the lookups, so the real upstream cost is 0 — the
 *   request still counts against the project's rate limit and free-tier
 *   allowance.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 429 / 503 retry later). Nothing is retried.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { GeolocationProvider } from '@molecule/api-geolocation'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: GeolocationProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: GeolocationProvider = new Proxy({} as GeolocationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
