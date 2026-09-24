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
 * import { searchTripOptions, setProvider } from '@molecule/api-travel'
 * import { createProvider } from '@molecule/api-travel-amadeus'
 *
 * // Startup: bond once. Env: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET (test sandbox by default).
 * setProvider(
 *   createProvider({
 *     clientId: process.env.AMADEUS_CLIENT_ID,
 *     clientSecret: process.env.AMADEUS_CLIENT_SECRET,
 *     useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
 *   }),
 * )
 *
 * // IATA CITY codes (PAR, not CDG) — the destination is also the hotel-search city.
 * const trip = await searchTripOptions({
 *   origin: 'NYC',
 *   destination: 'PAR',
 *   departureDate: '2026-11-10',
 *   returnDate: '2026-11-15', // REQUIRED for hotels (check-out date)
 *   travelers: { adults: 2 },
 *   includeActivities: true, // off by default
 *   maxResultsPerCategory: 5,
 * })
 * // trip.flights[0].price → { total: 612.4, currency: 'EUR' } (numbers, not strings)
 * // trip.hotels[0] → { name, price, checkInDate: '2026-11-10', checkOutDate: '2026-11-15', … }
 * // trip.cars → [] always (Amadeus has no car API)
 * ```
 *
 * @remarks
 * - **Use city codes for `destination`**: it is passed to Amadeus' hotels-by-city lookup
 *   (`cityCode`), so an airport code usually yields `hotels: []` even when flights come back.
 * - **`includeActivities` defaults to `false`**; flights and hotels default to `true`.
 *   `maxResultsPerCategory` caps each list (hotels default to 20).
 * - The test sandbox returns cached/synthetic inventory — prices and availability are not
 *   real until `useProduction: true` (or `AMADEUS_USE_PRODUCTION=true` with the default
 *   `provider`). `timeout` is milliseconds (default 15000). This bond searches only; it
 *   does not book.
 * - Missing credentials throw `AmadeusTravelMissingCredentialsError` (`code:
 *   'MISSING_CREDENTIALS'`) on the first search, not at `createProvider()`. An HTTP error
 *   from the flights, hotel-list or activities call rejects the whole search with
 *   `AmadeusTravelUpstreamError`; only hotel PRICING batches fail soft (see above).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
