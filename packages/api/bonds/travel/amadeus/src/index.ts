/**
 * Amadeus travel trip-planning provider for molecule.dev.
 *
 * Implements the `TravelProvider` interface against the Amadeus
 * Self-Service flight, hotel and activities APIs. Defaults to the
 * test sandbox (`https://test.api.amadeus.com`); set
 * `AMADEUS_USE_PRODUCTION=true` to route to production.
 *
 * Reuses the same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`
 * credentials as `@molecule/api-flights-amadeus` and
 * `@molecule/api-hotels-amadeus` — Amadeus issues a single
 * client-credentials pair per account that grants access to all of
 * its Self-Service products.
 *
 * Cars are intentionally returned as an empty array: Amadeus does not
 * expose a public car-rental API as of v22.
 *
 * Hotels require a check-out date: `searchTripOptions` prices hotels only
 * when `returnDate` is supplied — a one-way search (where `includeHotels`
 * defaults to true) resolves with `hotels: []` rather than throwing. Hotel
 * pricing is also best-effort per batch: individual batch failures are
 * swallowed and partial hotel results returned, so a short/empty hotels
 * array is not necessarily an upstream outage.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-travel'
 * import { provider } from '@molecule/api-travel-amadeus'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
