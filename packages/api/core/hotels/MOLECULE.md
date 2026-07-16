# @molecule/api-hotels

Provider-agnostic hotels interface for molecule.dev.

Defines the `HotelsProvider` interface for hotel inventory aggregators —
search, priced offers, and booking confirmation. Bond packages (Amadeus,
Booking.com Affiliate, Expedia Rapid, etc.) implement this interface.
Application code uses the convenience functions (`searchHotels`,
`getHotelOffers`, `bookHotel`) which delegate to the bonded provider.

Prices carry an explicit ISO 4217 currency so multi-market callers can
reconcile across providers. Hotel and offer IDs are kept as plain
strings so providers can use whatever opaque catalogue identifier they
expose.

## Quick Start

```typescript
import { setProvider, searchHotels, getHotelOffers } from '@molecule/api-hotels'
import { provider as amadeus } from '@molecule/api-hotels-amadeus'

setProvider(amadeus)
const hits = await searchHotels({
  cityCode: 'PAR',
  checkInDate: '2026-06-01',
  checkOutDate: '2026-06-04',
  adults: 2,
})
const offers = await getHotelOffers(hits[0].hotelId, {
  checkInDate: '2026-06-01',
  checkOutDate: '2026-06-04',
  adults: 2,
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-hotels @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `GeoLocation`

Geographic point used for radius-based hotel search.

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
   * Search radius around the point. Units are provider-defined but should
   * default to kilometres if not otherwise specified by the provider.
   * Optional — providers MAY apply a sensible default (e.g. 5 km).
   */
  radius?: number
}
```

#### `HotelAddress`

Geocoded address block returned with hotel search hits.

```typescript
interface HotelAddress {
  /**
   * ISO 3166-1 alpha-2 country code (e.g. `'US'`, `'FR'`), if known.
   */
  countryCode?: string

  /**
   * Free-form city name as the provider returns it (e.g. `'Paris'`).
   */
  cityName?: string

  /**
   * Free-form street / locality line, if the provider exposes one.
   */
  line?: string

  /**
   * Postal / ZIP code, if known.
   */
  postalCode?: string
}
```

#### `HotelBooking`

Confirmation record returned after a successful booking.

Note: many hotel providers only support "price the offer" + "redirect
the guest to the provider's checkout" flows rather than direct
bookings via API. Implementations that cannot complete a booking
server-side MAY surface that as an error and expose a separate
`priceOffer` flow; in that case {@link HotelsProvider.bookHotel} can
throw with a `cause.code === 'BOOKING_NOT_SUPPORTED'`.

```typescript
interface HotelBooking {
  /**
   * Provider-issued booking / reservation identifier.
   */
  bookingId: string

  /**
   * Hotel that was booked.
   */
  hotelId: HotelId

  /**
   * Offer that was confirmed.
   */
  offerId: HotelOfferId

  /**
   * Final price charged.
   */
  price: HotelPrice

  /**
   * Check-in date as `YYYY-MM-DD`.
   */
  checkInDate: IsoDate

  /**
   * Check-out date as `YYYY-MM-DD`.
   */
  checkOutDate: IsoDate

  /**
   * Lead guest information echoed back from the booking call.
   */
  guest: HotelGuestInfo

  /**
   * Provider-issued confirmation / itinerary number, if distinct from
   * {@link bookingId}.
   */
  confirmationNumber?: string
}
```

#### `HotelGuestInfo`

Guest information supplied to a booking call. Kept intentionally minimal
— providers that require additional fields (loyalty number, etc.) can
extend via interface merging in their own bond package.

```typescript
interface HotelGuestInfo {
  /**
   * Guest first / given name.
   */
  firstName: string

  /**
   * Guest last / family name.
   */
  lastName: string

  /**
   * Contact email for the booking confirmation.
   */
  email: string

  /**
   * Optional contact phone (E.164 format recommended).
   */
  phone?: string
}
```

#### `HotelOffer`

A single bookable room / rate combination for a specific hotel.

Offers are short-lived: the {@link offerId} is provider-issued and
typically expires within minutes. Consumers should re-fetch offers
immediately before initiating a booking flow.

```typescript
interface HotelOffer {
  /**
   * Opaque, provider-issued offer identifier. Pass to
   * {@link HotelsProvider.bookHotel} (or its equivalent) to confirm.
   */
  offerId: HotelOfferId

  /**
   * Hotel this offer belongs to.
   */
  hotelId: HotelId

  /**
   * Check-in date as `YYYY-MM-DD`.
   */
  checkInDate: IsoDate

  /**
   * Check-out date as `YYYY-MM-DD`.
   */
  checkOutDate: IsoDate

  /**
   * Total price for the entire stay (all nights).
   */
  price: HotelPrice

  /**
   * Free-form room name / type description (e.g. `'Deluxe King Room'`).
   * Optional — not every provider exposes one.
   */
  roomDescription?: string

  /**
   * Number of adults the offer is priced for.
   */
  adults?: number

  /**
   * Cancellation / refundability hint. `true` = explicitly refundable,
   * `false` = explicitly non-refundable, `undefined` = unknown.
   */
  refundable?: boolean

  /**
   * Rate code / class identifier (e.g. `'BAR'`, `'AAA'`), if exposed.
   */
  rateCode?: string
}
```

#### `HotelOffersCriteria`

Filter / refinement parameters when fetching priced offers for a
specific hotel.

```typescript
interface HotelOffersCriteria {
  /**
   * Check-in date as `YYYY-MM-DD`.
   */
  checkInDate: IsoDate

  /**
   * Check-out date as `YYYY-MM-DD`.
   */
  checkOutDate: IsoDate

  /**
   * Number of adult guests per room. Defaults to `1` when omitted.
   */
  adults?: number
}
```

#### `HotelPrice`

Monetary price block. Always carries an explicit currency.

```typescript
interface HotelPrice {
  /**
   * Total amount in major units of {@link currency} (e.g. dollars, not
   * cents).
   */
  total: number

  /**
   * ISO 4217 currency code the {@link total} is denominated in.
   */
  currency: CurrencyCode
}
```

#### `HotelSearchCriteria`

Search criteria for {@link HotelsProvider.searchHotels}.

Either {@link cityCode} or {@link location} MUST be supplied (callers
that supply both leave provider-specific behaviour up to the
implementation, which SHOULD prefer {@link location} when both are
present).

```typescript
interface HotelSearchCriteria {
  /**
   * IATA / city code to search within. Mutually exclusive with
   * {@link location} in the typical case.
   */
  cityCode?: CityCode

  /**
   * Geographic point + optional radius. Mutually exclusive with
   * {@link cityCode} in the typical case.
   */
  location?: GeoLocation

  /**
   * Check-in date as `YYYY-MM-DD`.
   */
  checkInDate: IsoDate

  /**
   * Check-out date as `YYYY-MM-DD`. MUST be strictly after
   * {@link checkInDate}.
   */
  checkOutDate: IsoDate

  /**
   * Number of adult guests per room. Defaults to `1` when omitted.
   * Providers MAY clamp very large values.
   */
  adults?: number

  /**
   * Number of rooms required. Defaults to `1` when omitted.
   */
  rooms?: number

  /**
   * Optional star-rating filter (e.g. `[4, 5]` to only return 4- and
   * 5-star properties). Providers without rating data MAY ignore this.
   */
  ratings?: number[]
}
```

#### `HotelSearchResult`

A single hotel returned by {@link HotelsProvider.searchHotels}.

Search hits are summary records — they identify the property and may
include a representative price snippet, but consumers should call
{@link HotelsProvider.getHotelOffers} to enumerate bookable rooms / rates.

```typescript
interface HotelSearchResult {
  /**
   * Provider-specific hotel identifier (opaque to callers).
   */
  hotelId: HotelId

  /**
   * Human-readable hotel name (e.g. `'Hotel de Paris'`).
   */
  name: string

  /**
   * IATA / city code the hotel is located in, if known.
   */
  cityCode?: CityCode

  /**
   * Star rating as an integer (1..5), if the provider exposes it.
   */
  rating?: number

  /**
   * Latitude in decimal degrees, if the provider exposes geocoordinates.
   */
  latitude?: number

  /**
   * Longitude in decimal degrees, if the provider exposes geocoordinates.
   */
  longitude?: number

  /**
   * Geocoded address block, if the provider exposes one.
   */
  address?: HotelAddress

  /**
   * Distance from the search anchor (city centre or {@link GeoLocation}),
   * if the provider returns one. Units are provider-defined.
   */
  distance?: number

  /**
   * "From" / starting price as a snippet so list views can render a price
   * without a second round-trip. Optional — not every provider returns a
   * price in the search response.
   */
  fromPrice?: HotelPrice
}
```

#### `HotelsProvider`

Hotel inventory aggregator provider interface.

All providers (Amadeus, Booking.com Affiliate, Expedia Rapid, fixtures,
etc.) implement this interface. The interface is deliberately minimal so
providers with very different upstream APIs can satisfy it identically.

```typescript
interface HotelsProvider {
  /**
   * Searches available hotels matching {@link criteria}.
   *
   * @param criteria - Search criteria (location + dates + room demand).
   * @returns Array of {@link HotelSearchResult}, possibly empty.
   */
  searchHotels(criteria: HotelSearchCriteria): Promise<HotelSearchResult[]>

  /**
   * Returns priced offers (room / rate combinations) for {@link hotelId}.
   * Offers are short-lived and should be re-fetched immediately before a
   * booking flow.
   *
   * @param hotelId - Provider-issued hotel identifier.
   * @param criteria - Date + occupancy filter.
   * @returns Array of {@link HotelOffer}, possibly empty.
   */
  getHotelOffers(hotelId: HotelId, criteria: HotelOffersCriteria): Promise<HotelOffer[]>

  /**
   * Confirms a booking against {@link offerId} for {@link guestInfo}.
   *
   * Providers that only support priced offers + provider-hosted checkout
   * (rather than direct API booking) SHOULD throw with `cause.code ===
   * 'BOOKING_NOT_SUPPORTED'`; callers can detect that and fall back to
   * the provider's redirect flow.
   *
   * @param offerId - Offer to confirm. Must be fresh (not expired).
   * @param guestInfo - Lead guest contact / identity details.
   * @returns Confirmed {@link HotelBooking} record.
   */
  bookHotel(offerId: HotelOfferId, guestInfo: HotelGuestInfo): Promise<HotelBooking>
}
```

### Types

#### `CityCode`

IATA / city code (e.g. `'PAR'`, `'NYC'`, `'LON'`). Plain string —
providers differ on which catalogues they expose.

```typescript
type CityCode = string
```

#### `CurrencyCode`

ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`).

```typescript
type CurrencyCode = string
```

#### `HotelId`

Provider-specific identifier for a hotel property (e.g. an Amadeus
`hotelId` such as `'MCLONGHM'`). Kept as a plain `string` so providers
can use whatever opaque catalogue ID they expose.

```typescript
type HotelId = string
```

#### `HotelOfferId`

Provider-specific identifier for a priced hotel offer (room / rate
combination). Offers are typically short-lived; consumers should treat
IDs as opaque and refresh them via {@link HotelsProvider.getHotelOffers}
before booking.

```typescript
type HotelOfferId = string
```

#### `IsoDate`

Calendar date in ISO `YYYY-MM-DD` form (no time, no timezone). Hotel
inventory is typically priced per night, not per minute, so a plain
date string is the canonical contract.

```typescript
type IsoDate = string
```

### Functions

#### `bookHotel(offerId, guestInfo)`

Confirms a hotel booking against {@link offerId} using the bonded
provider.

Providers that only support priced offers + provider-hosted checkout
MAY throw with `cause.code === 'BOOKING_NOT_SUPPORTED'`; callers can
detect that and fall back to a redirect flow.

```typescript
function bookHotel(offerId: string, guestInfo: HotelGuestInfo): Promise<HotelBooking>
```

- `offerId` — Offer to confirm. Must be fresh (not expired).
- `guestInfo` — Lead guest contact / identity details.

**Returns:** Confirmed {@link HotelBooking} record.

#### `getHotelOffers(hotelId, criteria)`

Returns priced offers for {@link hotelId} using the bonded provider.
Offers are short-lived and should be re-fetched immediately before a
booking flow.

```typescript
function getHotelOffers(hotelId: string, criteria: HotelOffersCriteria): Promise<HotelOffer[]>
```

- `hotelId` — Provider-issued hotel identifier.
- `criteria` — Date + occupancy filter.

**Returns:** Array of {@link HotelOffer}, possibly empty.

#### `getProvider()`

Retrieves the bonded hotels provider, throwing if none is configured.

```typescript
function getProvider(): HotelsProvider
```

**Returns:** The bonded hotels provider.

#### `hasProvider()`

Checks whether a hotels provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a hotels provider is bonded.

#### `searchHotels(criteria)`

Searches available hotels matching {@link criteria} using the bonded
provider.

```typescript
function searchHotels(criteria: HotelSearchCriteria): Promise<HotelSearchResult[]>
```

- `criteria` — Search criteria (location + dates + room demand).

**Returns:** Array of {@link HotelSearchResult}, possibly empty.

#### `setProvider(provider)`

Registers a hotels provider as the active singleton. Called by bond
packages (e.g. `@molecule/api-hotels-amadeus`) during application
startup.

```typescript
function setProvider(provider: HotelsProvider): void
```

- `provider` — The hotels provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Hotels (Amadeus) | `@molecule/api-hotels-amadeus` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Not every provider can complete a booking server-side.** Many hotel APIs
  only support search + priced offers and hand the guest to the provider's
  own checkout. Such bonds throw from `bookHotel` with
  `cause.code === 'BOOKING_NOT_SUPPORTED'` — handle that path (link out /
  deep-link to the provider) instead of assuming an in-app booking form works
  for every bond.
- **Offers are short-lived quotes, not reservations.** An `offerId` from
  `getHotelOffers` expires; book promptly after selection, and on a booking
  failure re-fetch offers and re-confirm the price with the user — never
  retry a stale offer id or present a cached price as bookable.
- Booking is a real-money, PII-bearing call: keep it SERVER-SIDE behind an
  authenticated endpoint (provider API keys live in the bond's config, never
  in app code), validate `guestInfo` server-side, and persist the returned
  `HotelBooking.bookingId` before reporting success to the user.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A search for a real location + check-in/check-out dates + guest count
  (`searchHotels` with a `cityCode` or `location`) returns REAL
  `HotelSearchResult`s rendered in the UI — each with a name, its city /
  `address`, and a `fromPrice` for the stay — never an empty list, a stuck
  spinner, or placeholder cards. Results match the query: the right city, and
  the dates / occupancy you entered are reflected in the prices shown.
- [ ] Any exposed filter or sort (price, star `rating`, amenities) actually
  narrows / reorders the rendered list — e.g. a price sort puts the lowest
  `HotelPrice.total` first; a 4–5 star filter drops lower-rated properties.
- [ ] Availability is respected: a sold-out or invalid-date search (e.g.
  `checkOutDate` not strictly after `checkInDate`) shows a visible "no
  availability" empty state — never a crash, a blank screen, or fabricated
  results.
- [ ] Prices total correctly and every amount shows its currency: a shown
  `HotelOffer.price.total` equals nights × nightly rate + any fees, in its
  ISO 4217 `HotelPrice.currency` (no bare "123" with no symbol or code).
- [ ] If hotel detail / booking is exposed, opening a hotel calls
  `getHotelOffers` and shows its real rooms / rates (`roomDescription` +
  `price`); selecting one records the chosen `offerId` in the app. Booking
  itself goes out-of-band to the vendor (or `bookHotel` throws
  `BOOKING_NOT_SUPPORTED` → a redirect) — verify the app's RECORDED
  selection, not a fake in-app confirmation.
- [ ] A provider error (upstream down / rate-limited) surfaces as a graceful,
  visible message — not a blank page or an unhandled rejection — and the
  provider API key stays server-side: search / offers / booking all run on
  the server, and no key appears in network responses or page source.
