# @molecule/api-flights

Provider-agnostic flights interface for molecule.dev.

Defines the {@link FlightsProvider} interface for flight search +
pricing. Bond packages (Amadeus, Duffel, Sabre, etc.) implement this
interface. Application code uses the convenience functions
(`searchFlights`, `getOffer`, `priceOffer`) which delegate to the bonded
provider.

## Quick Start

```typescript
import { setProvider, searchFlights, priceOffer } from '@molecule/api-flights'
import { provider as amadeus } from '@molecule/api-flights-amadeus'

setProvider(amadeus)
const offers = await searchFlights({
  origin: 'JFK',
  destination: 'LHR',
  departureDate: '2026-07-15',
  adults: 1,
})
const priced = await priceOffer(offers[0].id)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-flights @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `FlightOffer`

Normalized flight offer returned by
{@link FlightsProvider.searchFlights}.

```typescript
interface FlightOffer {
  /**
   * Provider-specific opaque offer identifier.
   */
  id: OfferId

  /**
   * Total grand-total price for ALL passengers in {@link currency}.
   */
  price: number

  /**
   * Currency the {@link price} is expressed in (e.g. `'USD'`).
   */
  currency: CurrencyCode

  /**
   * Flight segments, in chronological order. For round-trip itineraries
   * outbound segments precede return segments. For multi-city the order
   * matches the requested itinerary.
   */
  segments: Segment[]

  /**
   * Total elapsed time across all segments (including layovers).
   */
  duration: IsoDuration
}
```

#### `FlightOfferDetail`

Detailed flight offer returned by {@link FlightsProvider.getOffer}.

Extends {@link FlightOffer} with a per-passenger price breakdown and an
optional source-data envelope. Providers that do not naturally support a
"fetch single offer" call MAY return the same offer they previously
returned from `searchFlights` here (without a fresh upstream round-trip).

```typescript
interface FlightOfferDetail extends FlightOffer {
  /**
   * Per-passenger price breakdown rows. `null` when the upstream does not
   * supply the breakdown.
   */
  travelerPricings?: TravelerPricing[] | null
}
```

#### `FlightsProvider`

Flights provider interface.

All flight providers (Amadeus, Duffel, Sabre, etc.) implement this
interface. The interface is deliberately minimal so providers with very
different upstream APIs can satisfy it identically. Providers that lack
a "fetch single offer" call typically implement {@link getOffer} by
round-tripping through their pricing endpoint and returning the priced
offer.

```typescript
interface FlightsProvider {
  /**
   * Searches for flight offers matching the supplied itinerary.
   *
   * @param options - Search parameters (origin, destination, dates,
   *   passenger counts, cabin, etc.).
   * @returns Array of normalized flight offers.
   */
  searchFlights(options: SearchFlightsOptions): Promise<FlightOffer[]>

  /**
   * Retrieves a previously-searched offer in detail.
   *
   * @param offerId - Opaque offer identifier returned by
   *   {@link searchFlights}.
   * @returns The offer with per-passenger price breakdown when available.
   */
  getOffer(offerId: OfferId): Promise<FlightOfferDetail>

  /**
   * Confirms the up-to-the-minute price for a previously-searched offer.
   *
   * @param offerId - Opaque offer identifier returned by
   *   {@link searchFlights}.
   * @returns Authoritative price snapshot.
   */
  priceOffer(offerId: OfferId): Promise<PricingResult>
}
```

#### `PricingResult`

Result returned by {@link FlightsProvider.priceOffer}.

The `price` and `currency` reflect the upstream's authoritative price as
of the moment of the call — providers MAY return a different price than
the original {@link FlightOffer.price} if availability or fare rules
have shifted between search and pricing.

```typescript
interface PricingResult {
  /**
   * Original opaque offer identifier the call was made for.
   */
  offerId: OfferId

  /**
   * Authoritative grand-total price as of the moment of pricing.
   */
  price: number

  /**
   * Currency the {@link price} is expressed in.
   */
  currency: CurrencyCode

  /**
   * Per-passenger price breakdown rows. `null` when the upstream does not
   * supply the breakdown.
   */
  travelerPricings?: TravelerPricing[] | null

  /**
   * Timestamp the pricing snapshot was observed/published.
   */
  pricedAt: Date
}
```

#### `SearchFlightsOptions`

Options accepted by {@link FlightsProvider.searchFlights}.

```typescript
interface SearchFlightsOptions {
  /**
   * Origin IATA airport / city code (e.g. `'JFK'`, `'NYC'`).
   */
  origin: AirportCode

  /**
   * Destination IATA airport / city code.
   */
  destination: AirportCode

  /**
   * Outbound departure date (ISO 8601 calendar date, e.g. `'2026-07-15'`).
   */
  departureDate: IsoDate

  /**
   * Return date for round-trip searches. Omit for one-way.
   */
  returnDate?: IsoDate

  /**
   * Adult passenger count (>=12 years). Defaults to `1` when omitted.
   */
  adults?: number

  /**
   * Child passenger count (2-11 years). Defaults to `0` when omitted.
   */
  children?: number

  /**
   * Infant passenger count (<2 years, lap or seated). Defaults to `0`
   * when omitted.
   */
  infants?: number

  /**
   * Cabin class to search for. Defaults to `'economy'` when omitted.
   */
  cabin?: CabinClass

  /**
   * Maximum number of offers to return. Implementations MAY clamp this
   * to whatever upper bound their upstream API enforces.
   */
  maxResults?: number
}
```

#### `Segment`

One leg of a {@link FlightOffer} — a single take-off / landing pair on a
single operated flight.

```typescript
interface Segment {
  /**
   * Departure airport / instant.
   */
  departure: SegmentEndpoint

  /**
   * Arrival airport / instant.
   */
  arrival: SegmentEndpoint

  /**
   * Marketing carrier IATA code (e.g. `'AA'`, `'BA'`).
   */
  carrier: CarrierCode

  /**
   * Marketing flight number (e.g. `'100'`, `'1234'`).
   *
   * String rather than number to preserve any leading zeros and to
   * accommodate alphanumeric carriers (e.g. EasyJet's `'EZY'` prefix).
   */
  flightNumber: string

  /**
   * IATA aircraft code (e.g. `'77W'`, `'320'`). `null` when the upstream
   * does not supply aircraft data for this segment.
   */
  aircraft?: string | null

  /**
   * Block / total time the segment is in the air. `null` when the upstream
   * does not supply per-segment duration.
   */
  duration?: IsoDuration | null
}
```

#### `SegmentEndpoint`

Departure or arrival point on a {@link Segment}.

```typescript
interface SegmentEndpoint {
  /**
   * IATA airport code (e.g. `'JFK'`).
   */
  airport: AirportCode

  /**
   * Local-time instant including timezone offset.
   */
  at: IsoDateTime

  /**
   * Terminal designator (e.g. `'4'`, `'2A'`). `null` when not supplied.
   */
  terminal?: string | null
}
```

#### `TravelerPricing`

Per-passenger price row inside {@link FlightOfferDetail.travelerPricings}.

```typescript
interface TravelerPricing {
  /**
   * Provider-specific traveler id (typically a 1-indexed string).
   */
  travelerId: string

  /**
   * Adult, child, or infant. The infant variant is split between
   * lap-infants (`'held-infant'`) and seated infants (`'seated-infant'`)
   * because they are priced differently by most carriers.
   */
  travelerType: 'adult' | 'child' | 'held-infant' | 'seated-infant'

  /**
   * Total price for this traveler in the offer's currency.
   */
  price: number

  /**
   * Cabin class booked for this traveler. `null` when mixed across
   * segments or not supplied.
   */
  cabin?: CabinClass | null
}
```

### Types

#### `AirportCode`

IATA airport or city code (e.g. `'JFK'`, `'LAX'`, `'PAR'`).

Kept as a plain `string` alias rather than a string-literal union so
providers can support whatever set of airports / metropolitan codes their
upstream exposes.

```typescript
type AirportCode = string
```

#### `CabinClass`

Cabin class enumeration.

Providers map each value onto whatever upstream code they require
(e.g. Amadeus uses `'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'`).

```typescript
type CabinClass = 'economy' | 'premium-economy' | 'business' | 'first'
```

#### `CarrierCode`

IATA two-character airline / marketing carrier code (e.g. `'AA'`,
`'BA'`, `'AF'`).

```typescript
type CarrierCode = string
```

#### `CurrencyCode`

ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).

Conventionally upper-case to match {@link FlightOffer.currency} and the
vast majority of upstream travel APIs.

```typescript
type CurrencyCode = string
```

#### `IsoDate`

ISO 8601 calendar date (e.g. `'2026-07-15'`). Time-of-day MUST NOT be
included; this is a date for searching availability, not a timestamp.

```typescript
type IsoDate = string
```

#### `IsoDateTime`

ISO 8601 instant including timezone offset
(e.g. `'2026-07-15T08:30:00+02:00'`).

Providers SHOULD preserve the upstream offset where available; consumers
that want a `Date` can `new Date(value)` it.

```typescript
type IsoDateTime = string
```

#### `IsoDuration`

ISO 8601 duration string (e.g. `'PT2H30M'`, `'PT11H45M'`).

Plain string for the same reason as {@link IsoDate} — providers differ on
whether they expose seconds-precision, fractional minutes, etc.

```typescript
type IsoDuration = string
```

#### `OfferId`

Provider-specific offer identifier.

Opaque token returned by {@link FlightsProvider.searchFlights} that can
be passed back to {@link FlightsProvider.getOffer} or
{@link FlightsProvider.priceOffer}. Identifier scheme is provider-defined
and MUST NOT be parsed by consumers.

```typescript
type OfferId = string
```

### Functions

#### `getOffer(offerId)`

Retrieves a previously-searched offer in detail.

```typescript
function getOffer(offerId: string): Promise<FlightOfferDetail>
```

- `offerId` — Opaque offer identifier returned by `searchFlights`.

**Returns:** The offer with per-passenger price breakdown when available.

#### `getProvider()`

Retrieves the bonded flights provider, throwing if none is configured.

```typescript
function getProvider(): FlightsProvider
```

**Returns:** The bonded flights provider.

#### `hasProvider()`

Checks whether a flights provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a flights provider is bonded.

#### `priceOffer(offerId)`

Confirms the up-to-the-minute price for a previously-searched offer.

```typescript
function priceOffer(offerId: string): Promise<PricingResult>
```

- `offerId` — Opaque offer identifier returned by `searchFlights`.

**Returns:** Authoritative price snapshot.

#### `searchFlights(options)`

Searches for flight offers matching the supplied itinerary.

```typescript
function searchFlights(options: SearchFlightsOptions): Promise<FlightOffer[]>
```

- `options` — Search parameters (origin, destination, dates, passenger counts, cabin, etc.).

**Returns:** Array of normalized flight offers.

#### `setProvider(provider)`

Registers a flights provider as the active singleton. Called by bond
packages (e.g. `@molecule/api-flights-amadeus`) during application
startup.

```typescript
function setProvider(provider: FlightsProvider): void
```

- `provider` — The flights provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Amadeus | `@molecule/api-flights-amadeus` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Offer ids are opaque, provider-scoped, and short-lived.** Never parse
  them and never persist them as durable references — a stale id fails
  `getOffer`/`priceOffer`; re-run the search instead of replaying old ids.
- **Re-price before you commit.** `PricingResult.price` is the
  authoritative total at pricing time and MAY differ from the search-time
  `FlightOffer.price` — call `priceOffer()` right before the checkout/
  summary step and display the re-priced figure.
- **This contract is search + pricing only — there is no booking method.**
  Don't invent a `bookFlight()`; booking needs vendor-specific work outside
  this interface.
- **Server-side only; cache searches.** Flight-search APIs are slow,
  rate-limited, and often billed per call — cache results per (origin,
  destination, dates, passengers) for a short TTL and never fire a search
  per keystroke.
- Airports/cities are IATA codes (`'JFK'`, `'NYC'`), dates are ISO calendar
  dates (`'2026-07-15'`), and prices carry an explicit ISO 4217 `currency` —
  format with it, never a hardcoded `$`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual search / results screens, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] Searching a real route + future date (e.g. JFK→LHR, a date weeks out)
  returns REAL `searchFlights` offers rendered in the results list — each
  showing an origin, a destination, departure/arrival times, and a price. No
  empty list, `null`, or placeholder row is presented as a successful search.
- [ ] Results match the query: each offer's first `segment.departure.airport`
  and last `segment.arrival.airport` are the searched cities and the
  `departure.at` falls on the requested date — not random routes or dates.
- [ ] Every price shows its `currency` (ISO 4217, formatted with it — never a
  hardcoded `$`) and is sane (positive, right order of magnitude). If a
  checkout/summary step re-prices via `priceOffer`/`getOffer`, the displayed
  total is the re-priced figure, not the stale search-time price.
- [ ] Any exposed filter/sort (price, stops, departure/arrival time, cabin)
  actually narrows or reorders the SAME result set — not a fresh random list.
- [ ] An impossible or invalid search — no availability, a past date, or a
  bad airport code — shows a clear "no flights" / "invalid" state, not a
  crash and not a blank list presented as a successful search.
- [ ] A provider outage or rate-limit (HTTP 429) surfaces as a graceful,
  retryable error in the UI — not a hung spinner or a silent empty list.
- [ ] This contract is search + pricing ONLY (there is no `bookFlight`). If
  the app adds a book/hold step it goes OUT-OF-BAND to the vendor — verify
  the app records the SELECTED offer (its priced total + itinerary), since
  opaque `OfferId`s are short-lived and can't be replayed later.
- [ ] The provider API key stays server-side: searches run through the API
  bond and no key or upstream credential is ever exposed to the browser.
