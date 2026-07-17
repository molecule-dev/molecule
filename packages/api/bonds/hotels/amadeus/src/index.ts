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
 * import { setProvider } from '@molecule/api-hotels'
 * import { provider } from '@molecule/api-hotels-amadeus'
 *
 * setProvider(provider)
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
