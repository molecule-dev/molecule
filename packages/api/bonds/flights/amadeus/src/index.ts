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
 * import { setProvider } from '@molecule/api-flights'
 * import { provider } from '@molecule/api-flights-amadeus'
 *
 * setProvider(provider)
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
 * - HTTP 429 throws `AmadeusRateLimitedError` carrying `retryAfter` seconds
 *   when the upstream provides it — back off; don't retry immediately.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
