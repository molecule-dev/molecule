# @molecule/api-travel

Provider-agnostic travel trip-planning interface for molecule.dev.

Defines the {@link TravelProvider} interface for aggregate trip
planning across flights, hotels, cars and activities. Bond packages
(Amadeus, Travelport, Sabre, etc.) implement this interface.
Application code uses the convenience functions (`searchTripOptions`,
`searchActivities`, `searchCars`) which delegate to the bonded
provider.

## Quick Start

```typescript
import { setProvider, searchTripOptions } from '@molecule/api-travel'
import { provider as amadeus } from '@molecule/api-travel-amadeus'

setProvider(amadeus)
const trip = await searchTripOptions({
  origin: 'JFK',
  destination: 'PAR',
  departureDate: '2026-07-15',
  returnDate: '2026-07-22',
  travelers: { adults: 2 },
  includeFlights: true,
  includeHotels: true,
})
console.log(trip.flights.length, trip.hotels.length)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-travel @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `ActivityOffer`

Normalized activity / experience offer (e.g. a museum tour, food
walk, day trip) surfaced inside a {@link TripSearchResult}.

```typescript
interface ActivityOffer {
  /**
   * Provider-specific opaque offer / activity identifier.
   */
  id: OfferId

  /**
   * Human-readable activity name (e.g. `'Eiffel Tower skip-the-line'`).
   */
  name: string

  /**
   * Free-form short description, if the provider exposes one.
   */
  description?: string

  /**
   * Per-person or per-booking price (provider-defined). Treat as the
   * starting "from" price unless the provider documents otherwise.
   */
  price: MoneyAmount

  /**
   * Geographic point the activity takes place at, when known.
   */
  location?: GeoLocation

  /**
   * URL of a representative image, if the provider exposes one.
   */
  pictureUrl?: string

  /**
   * URL of the provider's booking / detail page, if exposed.
   */
  bookingUrl?: string

  /**
   * Provider-supplied minimum duration string (e.g. `'PT2H'`), if any.
   */
  minimumDuration?: IsoDuration
}
```

#### `CarOffer`

Normalized car-rental offer surfaced inside a {@link TripSearchResult}.

Most major travel aggregators expose car offers as a separate vertical;
the trip facade includes them so itinerary planners can present a
unified "ground transport" line item alongside flights and hotels.

```typescript
interface CarOffer {
  /**
   * Provider-specific opaque offer identifier.
   */
  id: OfferId

  /**
   * Vendor / supplier name (e.g. `'Hertz'`, `'Avis'`).
   */
  vendor: string

  /**
   * Free-form vehicle / category description (e.g.
   * `'Compact SUV or similar'`).
   */
  vehicleDescription: string

  /**
   * Total price for the entire rental.
   */
  price: MoneyAmount

  /**
   * Pickup location (IATA airport / city code or free-form locality).
   */
  pickupLocation: LocationCode

  /**
   * Pickup date / time.
   */
  pickupAt: IsoDateTime

  /**
   * Return date / time.
   */
  returnAt: IsoDateTime

  /**
   * Whether unlimited mileage is included. `undefined` when unknown.
   */
  unlimitedMileage?: boolean
}
```

#### `FlightOffer`

Normalized flight offer surfaced inside a {@link TripSearchResult}.

This is a minimal, travel-core-local shape — not the same TypeScript
type as `@molecule/api-flights`'s `FlightOffer`. Providers that wrap
the flights core MAY convert between the two structurally.

```typescript
interface FlightOffer {
  /**
   * Provider-specific opaque offer identifier.
   */
  id: OfferId

  /**
   * Total grand-total price for ALL travelers.
   */
  price: MoneyAmount

  /**
   * Flight segments in chronological order. For round-trip itineraries
   * outbound segments precede return segments.
   */
  segments: FlightSegment[]

  /**
   * Total elapsed time across all segments (including layovers).
   */
  duration: IsoDuration
}
```

#### `FlightSegment`

One leg of a flight offer — a single take-off / landing pair on a
single operated flight.

```typescript
interface FlightSegment {
  /**
   * Departure airport / instant.
   */
  departure: FlightSegmentEndpoint

  /**
   * Arrival airport / instant.
   */
  arrival: FlightSegmentEndpoint

  /**
   * Marketing carrier IATA code (e.g. `'AA'`, `'BA'`).
   */
  carrier: string

  /**
   * Marketing flight number (e.g. `'100'`, `'1234'`).
   */
  flightNumber: string

  /**
   * Block / total time the segment is in the air. `null` when the
   * upstream does not supply per-segment duration.
   */
  duration?: IsoDuration | null
}
```

#### `FlightSegmentEndpoint`

Departure or arrival point on a {@link FlightSegment}.

```typescript
interface FlightSegmentEndpoint {
  /**
   * IATA airport code (e.g. `'JFK'`).
   */
  airport: LocationCode

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

#### `GeoLocation`

Geographic point used for radius-based search of hotels, activities
or car-rental locations.

```typescript
interface GeoLocation {
  /**
   * Latitude in decimal degrees, WGS-84.
   */
  lat: number

  /**
   * Longitude in decimal degrees, WGS-84.
   */
  lon: number

  /**
   * Search radius around the point. Units are provider-defined but
   * SHOULD default to kilometres if not otherwise specified by the
   * provider.
   */
  radius?: number
}
```

#### `HotelOffer`

Normalized hotel offer surfaced inside a {@link TripSearchResult}.

```typescript
interface HotelOffer {
  /**
   * Provider-specific opaque offer identifier (room / rate
   * combination).
   */
  id: OfferId

  /**
   * Provider-specific hotel identifier the offer belongs to.
   */
  hotelId: string

  /**
   * Human-readable hotel name (e.g. `'Hotel de Paris'`).
   */
  name: string

  /**
   * Total price for the entire stay (all nights).
   */
  price: MoneyAmount

  /**
   * Check-in date (ISO 8601 calendar date).
   */
  checkInDate: IsoDate

  /**
   * Check-out date (ISO 8601 calendar date).
   */
  checkOutDate: IsoDate

  /**
   * Star rating as an integer (1..5), if the provider exposes it.
   */
  rating?: number

  /**
   * Free-form room name / type description, if supplied.
   */
  roomDescription?: string

  /**
   * Cancellation / refundability hint. `true` = explicitly refundable,
   * `false` = explicitly non-refundable, `undefined` = unknown.
   */
  refundable?: boolean
}
```

#### `MoneyAmount`

Monetary price block. Always carries an explicit currency.

```typescript
interface MoneyAmount {
  /**
   * Total amount in major units of {@link currency} (e.g. dollars,
   * not cents).
   */
  total: number

  /**
   * ISO 4217 currency code the {@link total} is denominated in.
   */
  currency: CurrencyCode
}
```

#### `SearchActivitiesOptions`

Search criteria for {@link TravelProvider.searchActivities}.

Activities are typically scoped to a destination + date range and
filtered by the provider's own catalogue. Most providers expose
latitude / longitude search rather than IATA codes, so callers can
supply either form.

```typescript
interface SearchActivitiesOptions {
  /**
   * Destination — either an IATA airport / city code or a geographic
   * point with optional radius. Providers SHOULD prefer
   * {@link GeoLocation} when both are present.
   */
  destination: LocationCode | GeoLocation

  /**
   * Date range as `[start, end]` ISO calendar dates. Providers MAY
   * ignore the range and return their full catalogue if the upstream
   * does not support date-filtered availability.
   */
  dates?: { start: IsoDate; end: IsoDate }

  /**
   * Maximum number of offers to return.
   */
  maxResults?: number
}
```

#### `SearchCarsOptions`

Search criteria for {@link TravelProvider.searchCars}.

```typescript
interface SearchCarsOptions {
  /**
   * IATA airport / city code or free-form locality string for the
   * pickup location.
   */
  pickupLocation: LocationCode

  /**
   * Date / time the car is collected.
   */
  pickupDate: IsoDate | IsoDateTime

  /**
   * Date / time the car is returned.
   */
  returnDate: IsoDate | IsoDateTime

  /**
   * Optional alternate dropoff location. Defaults to
   * {@link pickupLocation} when omitted.
   */
  dropoffLocation?: LocationCode

  /**
   * Maximum number of offers to return.
   */
  maxResults?: number
}
```

#### `SearchTripOptions`

Search criteria for {@link TravelProvider.searchTripOptions}.

The criteria are deliberately broad: travelers typically want to see
flights + hotels + cars + activities all at once when planning a
trip, so the same date / origin / destination apply to each. Per-
vertical filtering (cabin, hotel rating, etc.) is left to follow-up
calls against the per-vertical cores.

```typescript
interface SearchTripOptions {
  /**
   * Origin IATA airport / city code (e.g. `'JFK'`, `'NYC'`). Used for
   * the flight portion of the trip.
   */
  origin: LocationCode

  /**
   * Destination IATA airport / city code. Used for the flight portion
   * of the trip and as the catalogue lookup for hotels / activities
   * when the provider supports it.
   */
  destination: LocationCode

  /**
   * Outbound departure date (ISO 8601 calendar date). Also serves as
   * the hotel check-in date.
   */
  departureDate: IsoDate

  /**
   * Return date for round-trip searches. Also serves as the hotel
   * check-out date when supplied. Omit for one-way / open-ended trips.
   */
  returnDate?: IsoDate

  /**
   * Traveler-count breakdown. Defaults to a single adult when omitted.
   */
  travelers?: TravelerCounts

  /**
   * Whether to include flight offers in the result. Defaults to
   * `true`.
   */
  includeFlights?: boolean

  /**
   * Whether to include hotel offers in the result. Defaults to
   * `true`.
   */
  includeHotels?: boolean

  /**
   * Whether to include car-rental offers in the result. Defaults to
   * `false` (most providers do not expose a car-rental API; opt in
   * explicitly when you know yours does).
   */
  includeCars?: boolean

  /**
   * Whether to include activity offers in the result. Defaults to
   * `false` for the same reason as {@link includeCars}.
   */
  includeActivities?: boolean

  /**
   * Maximum number of offers per vertical. Implementations MAY clamp
   * this to whatever upper bound their upstream API enforces.
   */
  maxResultsPerCategory?: number
}
```

#### `TravelerCounts`

Traveler-count breakdown supplied to {@link TravelProvider.searchTripOptions}.

```typescript
interface TravelerCounts {
  /**
   * Adult travelers (>=12 years). Defaults to `1` when omitted.
   */
  adults?: number

  /**
   * Child travelers (2-11 years). Defaults to `0` when omitted.
   */
  children?: number

  /**
   * Infant travelers (<2 years). Defaults to `0` when omitted.
   */
  infants?: number
}
```

#### `TravelProvider`

Travel trip-planning provider interface.

All travel providers (Amadeus, Travelport, Sabre, fixtures, etc.)
implement this interface. The interface is deliberately minimal and
aggregates across the per-vertical cores (`@molecule/api-flights`,
`@molecule/api-hotels`) so callers building "search a trip"
itinerary UIs can issue a single call and render mixed results.

Providers that lack one of the vertical APIs (e.g. Amadeus does not
expose a public cars API as of v22) MUST return an empty array for
that vertical rather than throwing — the absence is data, not an
error.

```typescript
interface TravelProvider {
  /**
   * Searches for trip options matching the supplied itinerary. Returns
   * an aggregated {@link TripSearchResult} containing flights,
   * hotels, cars and activities (each opt-in via the corresponding
   * `include*` flag).
   *
   * @param options - Trip search criteria.
   * @returns Aggregated trip search result.
   */
  searchTripOptions(options: SearchTripOptions): Promise<TripSearchResult>

  /**
   * Searches for activity / experience offers at a destination.
   *
   * @param options - Activity search criteria.
   * @returns Array of normalized activity offers, possibly empty.
   */
  searchActivities(options: SearchActivitiesOptions): Promise<ActivityOffer[]>

  /**
   * Searches for car-rental offers.
   *
   * Providers without a car-rental API MUST return an empty array
   * rather than throwing.
   *
   * @param options - Car-rental search criteria.
   * @returns Array of normalized car-rental offers, possibly empty.
   */
  searchCars(options: SearchCarsOptions): Promise<CarOffer[]>
}
```

#### `TripSearchResult`

Aggregated trip-search result returned by
{@link TravelProvider.searchTripOptions}.

Each per-vertical array is empty (NOT `undefined`) when the caller
did not opt in to that vertical or when the provider returned no
offers — this lets consumers iterate without conditional access
checks.

```typescript
interface TripSearchResult {
  /**
   * Flight offers matching the trip search. Empty when
   * {@link SearchTripOptions.includeFlights} is `false` or the
   * provider returned none.
   */
  flights: FlightOffer[]

  /**
   * Hotel offers matching the trip search. Empty when
   * {@link SearchTripOptions.includeHotels} is `false` or the
   * provider returned none.
   */
  hotels: HotelOffer[]

  /**
   * Car-rental offers matching the trip search. Empty when
   * {@link SearchTripOptions.includeCars} is `false` or the provider
   * does not expose a car-rental API.
   */
  cars: CarOffer[]

  /**
   * Activity offers matching the trip search. Empty when
   * {@link SearchTripOptions.includeActivities} is `false` or the
   * provider returned none.
   */
  activities: ActivityOffer[]
}
```

### Types

#### `CurrencyCode`

ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).

```typescript
type CurrencyCode = string
```

#### `IsoDate`

ISO 8601 calendar date (e.g. `'2026-07-15'`). Time-of-day MUST NOT be
included — this is a date for searching availability, not a timestamp.

```typescript
type IsoDate = string
```

#### `IsoDateTime`

ISO 8601 instant including timezone offset
(e.g. `'2026-07-15T08:30:00+02:00'`).

```typescript
type IsoDateTime = string
```

#### `IsoDuration`

ISO 8601 duration string (e.g. `'PT2H30M'`, `'PT11H45M'`). Plain
string for the same reason as {@link IsoDate} — providers differ on
whether they expose seconds-precision, fractional minutes, etc.

```typescript
type IsoDuration = string
```

#### `LocationCode`

IATA airport / city / metropolitan code (e.g. `'JFK'`, `'NYC'`,
`'PAR'`). Plain string alias — providers map onto whatever upstream
catalogue they expose.

```typescript
type LocationCode = string
```

#### `OfferId`

Provider-specific opaque offer identifier. Identifier scheme is
provider-defined and MUST NOT be parsed by consumers.

```typescript
type OfferId = string
```

### Functions

#### `getProvider()`

Retrieves the bonded travel provider, throwing if none is configured.

```typescript
function getProvider(): TravelProvider
```

**Returns:** The bonded travel provider.

#### `hasProvider()`

Checks whether a travel provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a travel provider is bonded.

#### `searchActivities(options)`

Searches for activity / experience offers at a destination using the
bonded provider.

```typescript
function searchActivities(options: SearchActivitiesOptions): Promise<ActivityOffer[]>
```

- `options` — Activity search criteria.

**Returns:** Array of normalized activity offers, possibly empty.

#### `searchCars(options)`

Searches for car-rental offers using the bonded provider.

Providers without a car-rental API return an empty array rather
than throwing.

```typescript
function searchCars(options: SearchCarsOptions): Promise<CarOffer[]>
```

- `options` — Car-rental search criteria.

**Returns:** Array of normalized car-rental offers, possibly empty.

#### `searchTripOptions(options)`

Searches for trip options (flights + hotels + cars + activities)
using the bonded provider.

```typescript
function searchTripOptions(options: SearchTripOptions): Promise<TripSearchResult>
```

- `options` — Trip search criteria.

**Returns:** Aggregated trip search result.

#### `setProvider(provider)`

Registers a travel provider as the active singleton. Called by bond
packages (e.g. `@molecule/api-travel-amadeus`) during application
startup.

```typescript
function setProvider(provider: TravelProvider): void
```

- `provider` — The travel provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Amadeus | `@molecule/api-travel-amadeus` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
