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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual search / results screens, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip:
 * - [ ] Searching a real route + future date (e.g. JFK→LHR, a date weeks out)
 *   returns REAL `searchFlights` offers rendered in the results list — each
 *   showing an origin, a destination, departure/arrival times, and a price. No
 *   empty list, `null`, or placeholder row is presented as a successful search.
 * - [ ] Results match the query: each offer's first `segment.departure.airport`
 *   and last `segment.arrival.airport` are the searched cities and the
 *   `departure.at` falls on the requested date — not random routes or dates.
 * - [ ] Every price shows its `currency` (ISO 4217, formatted with it — never a
 *   hardcoded `$`) and is sane (positive, right order of magnitude). If a
 *   checkout/summary step re-prices via `priceOffer`/`getOffer`, the displayed
 *   total is the re-priced figure, not the stale search-time price.
 * - [ ] Any exposed filter/sort (price, stops, departure/arrival time, cabin)
 *   actually narrows or reorders the SAME result set — not a fresh random list.
 * - [ ] An impossible or invalid search — no availability, a past date, or a
 *   bad airport code — shows a clear "no flights" / "invalid" state, not a
 *   crash and not a blank list presented as a successful search.
 * - [ ] A provider outage or rate-limit (HTTP 429) surfaces as a graceful,
 *   retryable error in the UI — not a hung spinner or a silent empty list.
 * - [ ] This contract is search + pricing ONLY (there is no `bookFlight`). If
 *   the app adds a book/hold step it goes OUT-OF-BAND to the vendor — verify
 *   the app records the SELECTED offer (its priced total + itinerary), since
 *   opaque `OfferId`s are short-lived and can't be replayed later.
 * - [ ] The provider API key stays server-side: searches run through the API
 *   bond and no key or upstream credential is ever exposed to the browser.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
