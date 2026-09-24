/**
 * Amadeus hotels provider for molecule.dev.
 *
 * Implements the `HotelsProvider` interface against the Amadeus
 * Self-Service hotels APIs. Provides hotel search (city or geo),
 * priced offer lookup (`/v3/shopping/hotel-offers`), and a booking
 * stub that explicitly surfaces "use the hosted checkout flow"
 * (Amadeus's direct hotel-booking endpoint requires PCI-compliant
 * card capture and is not safely callable from a generic bond).
 *
 * Authentication uses Amadeus's OAuth2 client-credentials flow, with
 * the same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` env vars
 * shared with `@molecule/api-flights-amadeus`. The bond mints and
 * caches tokens per-provider-instance.
 *
 * The OAuth secret NEVER appears in error messages. URLs do not carry
 * authentication in the query string — the bearer token is sent via
 * the `Authorization` header — so URL-redaction is unnecessary.
 *
 * @example
 * ```typescript
 * import { getHotelOffers, searchHotels, setProvider } from '@molecule/api-hotels'
 * import { createProvider } from '@molecule/api-hotels-amadeus'
 *
 * // Startup: bond once. Same key pair as @molecule/api-flights-amadeus (test keys → test host).
 * setProvider(
 *   createProvider({
 *     clientId: process.env.AMADEUS_CLIENT_ID,
 *     clientSecret: process.env.AMADEUS_CLIENT_SECRET,
 *     useProduction: process.env.AMADEUS_USE_PRODUCTION === 'true',
 *   }),
 * )
 *
 * const stay = { checkInDate: '2026-12-15', checkOutDate: '2026-12-18', adults: 2 } // YYYY-MM-DD
 *
 * // cityCode is an IATA CITY code ('PAR'), not a city name.
 * const hotels = await searchHotels({ cityCode: 'PAR', ...stay }) // [{ hotelId, name, fromPrice? }]
 *
 * const first = hotels[0]
 * if (first) {
 *   const offers = await getHotelOffers(first.hotelId, stay)
 *   // [{ offerId, hotelId, price: { total: 612.4, currency: 'EUR' }, roomDescription?, refundable? }]
 *   console.log(first.name, offers[0]?.price.total)
 * }
 * ```
 *
 * @remarks
 * - **Defaults to the TEST sandbox host (`test.api.amadeus.com`)** — identical
 *   to `@molecule/api-flights-amadeus`. Amadeus issues Self-Service TEST keys
 *   first (production needs approval), and a token is host-specific, so the
 *   safe default is TEST. Set `AMADEUS_USE_PRODUCTION=true` (or
 *   `useProduction`/`baseUrl` on `createProvider()`) to route to production.
 *   Because BOTH the flights and hotels bonds read the same
 *   `AMADEUS_USE_PRODUCTION` env var, one setting flips them together — so a
 *   travel app wiring flights + hotels with one key pair never has one bond
 *   401ing on the wrong host.
 * - `bookHotel()` ALWAYS throws (see the core's remarks) — implement checkout
 *   on the vendor's hosted flow; search and priced offers are fully supported.
 *   The error's `cause` is `{ code: BOOKING_NOT_SUPPORTED }`.
 * - `searchHotels()` needs `cityCode` OR `location` (`{ lat, lon, radius? }`), and dates must
 *   be exactly `YYYY-MM-DD` — otherwise it throws before calling Amadeus. `fromPrice` is
 *   best-effort: a failed price lookup leaves it `undefined` rather than failing the search.
 * - Failures are plain `Error`s with `cause.code` — `MISSING_CREDENTIALS`,
 *   `TOKEN_MINT_FAILED` or `UPSTREAM_ERROR` (HTTP 429 included; there is no rate-limit class
 *   here, unlike the flights bond). `createProvider()` falls back to
 *   `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET` for omitted credentials, but NOT to
 *   `AMADEUS_USE_PRODUCTION` — pass `useProduction` yourself (as above).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
