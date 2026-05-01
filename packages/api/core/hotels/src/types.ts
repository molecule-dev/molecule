/**
 * Type definitions for the hotels core interface.
 *
 * @module
 */

/**
 * Provider-specific identifier for a hotel property (e.g. an Amadeus
 * `hotelId` such as `'MCLONGHM'`). Kept as a plain `string` so providers
 * can use whatever opaque catalogue ID they expose.
 */
export type HotelId = string

/**
 * Provider-specific identifier for a priced hotel offer (room / rate
 * combination). Offers are typically short-lived; consumers should treat
 * IDs as opaque and refresh them via {@link HotelsProvider.getHotelOffers}
 * before booking.
 */
export type HotelOfferId = string

/**
 * IATA / city code (e.g. `'PAR'`, `'NYC'`, `'LON'`). Plain string —
 * providers differ on which catalogues they expose.
 */
export type CityCode = string

/**
 * ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`).
 */
export type CurrencyCode = string

/**
 * Calendar date in ISO `YYYY-MM-DD` form (no time, no timezone). Hotel
 * inventory is typically priced per night, not per minute, so a plain
 * date string is the canonical contract.
 */
export type IsoDate = string

/**
 * Geographic point used for radius-based hotel search.
 */
export interface GeoLocation {
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

/**
 * Search criteria for {@link HotelsProvider.searchHotels}.
 *
 * Either {@link cityCode} or {@link location} MUST be supplied (callers
 * that supply both leave provider-specific behaviour up to the
 * implementation, which SHOULD prefer {@link location} when both are
 * present).
 */
export interface HotelSearchCriteria {
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

/**
 * Filter / refinement parameters when fetching priced offers for a
 * specific hotel.
 */
export interface HotelOffersCriteria {
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

/**
 * Geocoded address block returned with hotel search hits.
 */
export interface HotelAddress {
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

/**
 * A single hotel returned by {@link HotelsProvider.searchHotels}.
 *
 * Search hits are summary records — they identify the property and may
 * include a representative price snippet, but consumers should call
 * {@link HotelsProvider.getHotelOffers} to enumerate bookable rooms / rates.
 */
export interface HotelSearchResult {
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

/**
 * Monetary price block. Always carries an explicit currency.
 */
export interface HotelPrice {
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

/**
 * A single bookable room / rate combination for a specific hotel.
 *
 * Offers are short-lived: the {@link offerId} is provider-issued and
 * typically expires within minutes. Consumers should re-fetch offers
 * immediately before initiating a booking flow.
 */
export interface HotelOffer {
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

/**
 * Guest information supplied to a booking call. Kept intentionally minimal
 * — providers that require additional fields (loyalty number, etc.) can
 * extend via interface merging in their own bond package.
 */
export interface HotelGuestInfo {
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

/**
 * Confirmation record returned after a successful booking.
 *
 * Note: many hotel providers only support "price the offer" + "redirect
 * the guest to the provider's checkout" flows rather than direct
 * bookings via API. Implementations that cannot complete a booking
 * server-side MAY surface that as an error and expose a separate
 * `priceOffer` flow; in that case {@link HotelsProvider.bookHotel} can
 * throw with a `cause.code === 'BOOKING_NOT_SUPPORTED'`.
 */
export interface HotelBooking {
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

/**
 * Hotel inventory aggregator provider interface.
 *
 * All providers (Amadeus, Booking.com Affiliate, Expedia Rapid, fixtures,
 * etc.) implement this interface. The interface is deliberately minimal so
 * providers with very different upstream APIs can satisfy it identically.
 */
export interface HotelsProvider {
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
