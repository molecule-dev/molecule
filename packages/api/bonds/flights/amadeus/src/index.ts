/**
 * Amadeus flights provider for molecule.dev.
 *
 * Implements the `FlightsProvider` interface against the Amadeus
 * Self-Service v2 flight-offers and v1 flight-offers pricing endpoints.
 * Defaults to the test sandbox (`https://test.api.amadeus.com`); set
 * `AMADEUS_USE_PRODUCTION=true` to route to production.
 *
 * @example
 * ```typescript
 * import { priceOffer, searchFlights, setProvider } from '@molecule/api-flights'
 * import { AmadeusRateLimitedError, createProvider } from '@molecule/api-flights-amadeus'
 *
 * // Startup: bond once. Keys from https://developers.amadeus.com (test keys → test host).
 * setProvider(
 *   createProvider({
 *     clientId: process.env.AMADEUS_CLIENT_ID,
 *     clientSecret: process.env.AMADEUS_CLIENT_SECRET,
 *     useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
 *   }),
 * )
 *
 * try {
 *   const offers = await searchFlights({
 *     origin: 'JFK', // IATA codes, not city names
 *     destination: 'LHR',
 *     departureDate: '2026-12-15', // YYYY-MM-DD
 *     adults: 1,
 *     maxResults: 5,
 *   }) // [{ id, price: 542.5, currency: 'USD', segments, duration: 'PT7H30M' }]
 *
 *   const cheapest = offers[0]
 *   if (cheapest) {
 *     // Re-price right before booking — same process as the search (ids live in memory).
 *     const quote = await priceOffer(cheapest.id) // { offerId, price, currency, pricedAt }
 *     console.log(`${cheapest.segments.length} segment(s), ${quote.price} ${quote.currency}`)
 *   }
 * } catch (error) {
 *   if (!(error instanceof AmadeusRateLimitedError)) throw error
 *   console.warn(`Amadeus rate-limited; retry in ${error.retryAfterSeconds ?? 1}s`)
 * }
 * ```
 *
 * @remarks
 * - **`getOffer()`/`priceOffer()` resolve offer ids from an in-process cache**
 *   populated by `searchFlights()` (bounded, default 1000 offers,
 *   `offerCacheSize` config). An id from another process/instance, from
 *   before a restart, or already evicted throws `AmadeusUnknownOfferError` —
 *   search and price within the same process, and re-run the search rather
 *   than replaying stored ids.
 * - Test keys only work against the TEST host (the default) and production
 *   keys only against production — `AMADEUS_USE_PRODUCTION=true` must match
 *   the key type. `@molecule/api-hotels-amadeus` shares the same
 *   `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET` AND defaults to the same TEST
 *   host, and reads the same `AMADEUS_USE_PRODUCTION` switch — so one env
 *   setting flips both bonds together; no per-bond host alignment needed.
 * - HTTP 429 throws `AmadeusRateLimitedError` carrying `retryAfterSeconds`
 *   (`null` when the upstream sent no `Retry-After`) — back off; don't retry
 *   immediately. Other non-OK statuses throw `AmadeusUpstreamError` (`status`).
 * - `createProvider()` does NOT read the environment — pass `clientId` /
 *   `clientSecret` / `useProduction` explicitly (as above). Only the lazy
 *   `provider` export reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`,
 *   `AMADEUS_USE_PRODUCTION` and `AMADEUS_BASE_URL`. Missing credentials throw
 *   `AmadeusMissingCredentialsError` on the first call, not at bond time.
 * - `price` values are numbers in major units (Amadeus `grandTotal`, falling
 *   back to `total`); `duration` is an ISO-8601 duration string such as
 *   `'PT7H30M'`, summed across itineraries. This bond searches and prices
 *   only — it does NOT book (no flight-orders call).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
