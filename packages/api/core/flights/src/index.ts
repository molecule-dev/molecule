/**
 * Provider-agnostic flights interface for molecule.dev.
 *
 * Defines the {@link FlightsProvider} interface for flight search +
 * pricing. Bond packages (Amadeus, Duffel, Sabre, etc.) implement this
 * interface. Application code uses the convenience functions
 * (`searchFlights`, `getOffer`, `priceOffer`) which delegate to the bonded
 * provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchFlights, priceOffer } from '@molecule/api-flights'
 * import { provider as amadeus } from '@molecule/api-flights-amadeus'
 *
 * setProvider(amadeus)
 * const offers = await searchFlights({
 *   origin: 'JFK',
 *   destination: 'LHR',
 *   departureDate: '2026-07-15',
 *   adults: 1,
 * })
 * const priced = await priceOffer(offers[0].id)
 * ```
 *
 * @remarks
 * - **Offer ids are opaque, provider-scoped, and short-lived.** Never parse
 *   them and never persist them as durable references — a stale id fails
 *   `getOffer`/`priceOffer`; re-run the search instead of replaying old ids.
 * - **Re-price before you commit.** `PricingResult.price` is the
 *   authoritative total at pricing time and MAY differ from the search-time
 *   `FlightOffer.price` — call `priceOffer()` right before the checkout/
 *   summary step and display the re-priced figure.
 * - **This contract is search + pricing only — there is no booking method.**
 *   Don't invent a `bookFlight()`; booking needs vendor-specific work outside
 *   this interface.
 * - **Server-side only; cache searches.** Flight-search APIs are slow,
 *   rate-limited, and often billed per call — cache results per (origin,
 *   destination, dates, passengers) for a short TTL and never fire a search
 *   per keystroke.
 * - Airports/cities are IATA codes (`'JFK'`, `'NYC'`), dates are ISO calendar
 *   dates (`'2026-07-15'`), and prices carry an explicit ISO 4217 `currency` —
 *   format with it, never a hardcoded `$`.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
