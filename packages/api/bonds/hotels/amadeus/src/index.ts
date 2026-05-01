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
 * @module
 */

export * from './provider.js'
export * from './types.js'
