/**
 * Provider-agnostic travel trip-planning interface for molecule.dev.
 *
 * Defines the {@link TravelProvider} interface for aggregate trip
 * planning across flights, hotels, cars and activities. Bond packages
 * (Amadeus, Travelport, Sabre, etc.) implement this interface.
 * Application code uses the convenience functions (`searchTripOptions`,
 * `searchActivities`, `searchCars`) which delegate to the bonded
 * provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchTripOptions } from '@molecule/api-travel'
 * import { provider as amadeus } from '@molecule/api-travel-amadeus'
 *
 * setProvider(amadeus)
 * const trip = await searchTripOptions({
 *   origin: 'JFK',
 *   destination: 'PAR',
 *   departureDate: '2026-07-15',
 *   returnDate: '2026-07-22',
 *   travelers: { adults: 2 },
 *   includeFlights: true,
 *   includeHotels: true,
 * })
 * console.log(trip.flights.length, trip.hotels.length)
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual trip-planning / results screens, and check
 * every box off one by one. A box you can't check is an integration bug to
 * fix — not a skip:
 * - [ ] A real trip search (`searchTripOptions` with a real `origin` ->
 *   `destination`, a `departureDate` weeks out, and `returnDate` for a round
 *   trip — e.g. JFK -> PAR) returns REAL results rendered in the UI: each
 *   opted-in vertical (`includeFlights` / `includeHotels` / `includeCars` /
 *   `includeActivities`) shows populated `flights` / `hotels` / `cars` /
 *   `activities`, each an actual offer — never an empty list, a stuck spinner,
 *   or a placeholder row presented as a successful search.
 * - [ ] Results match the query: each `FlightOffer`'s first
 *   `segments[].departure.airport` is the searched `origin` and its last
 *   `arrival.airport` the `destination`, on the requested dates; each
 *   `HotelOffer` is at the destination with `checkInDate` / `checkOutDate`
 *   equal to the searched departure / return dates — not random routes,
 *   cities, or dates.
 * - [ ] Each vertical is opt-in and additive: toggling `includeFlights`,
 *   `includeHotels`, `includeCars`, or `includeActivities` adds ONLY that
 *   section, and a vertical not requested (or one the provider can't serve,
 *   e.g. cars) comes back as an EMPTY array — rendered as "none", never as a
 *   failed or blank search. `maxResultsPerCategory` actually caps how many
 *   offers each section shows. Any separate activities / cars screen calls
 *   `searchActivities` / `searchCars` and renders its own `ActivityOffer[]` /
 *   `CarOffer[]`.
 * - [ ] Every offer's `price.total` shows its ISO 4217 `price.currency`
 *   (formatted with it — never a hardcoded `$`) and is sane: a flight total
 *   is the grand total for ALL `travelers`, a hotel total covers the whole
 *   stay, a car total the whole rental — positive and the right order of
 *   magnitude.
 * - [ ] An impossible or invalid search — a bad IATA code, a past
 *   `departureDate`, a `returnDate` before it, or a route with no
 *   availability — shows a clear per-section "no results" / "invalid" state,
 *   not a crash and not a blank list presented as a successful search.
 * - [ ] A provider outage or rate-limit (HTTP 429) surfaces as a graceful,
 *   retryable error in the UI — not a hung spinner or a silent empty list.
 * - [ ] This contract is search ONLY (there is no book / reserve call).
 *   Booking goes OUT-OF-BAND to the vendor (an `ActivityOffer.bookingUrl` or
 *   the app's own checkout) — verify the app RECORDS the SELECTED offer (its
 *   priced total + itinerary), since opaque `OfferId`s are short-lived and
 *   can't be replayed later.
 * - [ ] The provider API key stays server-side: every search runs through the
 *   API bond (the package is SERVER-ONLY), no key or upstream credential
 *   reaches the browser, and the endpoint validates origin / destination /
 *   dates instead of forwarding arbitrary caller input upstream (an open
 *   proxy would leak quota or enable SSRF).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
