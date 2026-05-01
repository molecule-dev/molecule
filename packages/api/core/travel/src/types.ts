/**
 * Type definitions for the travel trip-planning core interface.
 *
 * The travel core is an aggregate "trip planning" facade that combines
 * flights + hotels + cars + activities behind a single
 * {@link TravelProvider}. It is deliberately broader than the per-vertical
 * {@link FlightOffer}-only or {@link HotelOffer}-only cores so that
 * itinerary-planning UIs can issue a single search and render mixed
 * results.
 *
 * Vertical-specific shapes ({@link FlightOffer}, {@link HotelOffer},
 * {@link CarOffer}, {@link ActivityOffer}) are intentionally re-defined
 * here as minimal, normalized records. They are NOT imported from the
 * per-vertical cores: that would couple the travel core to flights/hotels
 * implementation details and force consumers to install both. Providers
 * that wrap multiple per-vertical bonds may convert between the two.
 *
 * @module
 */

/**
 * IATA airport / city / metropolitan code (e.g. `'JFK'`, `'NYC'`,
 * `'PAR'`). Plain string alias — providers map onto whatever upstream
 * catalogue they expose.
 */
export type LocationCode = string

/**
 * ISO 8601 calendar date (e.g. `'2026-07-15'`). Time-of-day MUST NOT be
 * included — this is a date for searching availability, not a timestamp.
 */
export type IsoDate = string

/**
 * ISO 8601 instant including timezone offset
 * (e.g. `'2026-07-15T08:30:00+02:00'`).
 */
export type IsoDateTime = string

/**
 * ISO 8601 duration string (e.g. `'PT2H30M'`, `'PT11H45M'`). Plain
 * string for the same reason as {@link IsoDate} — providers differ on
 * whether they expose seconds-precision, fractional minutes, etc.
 */
export type IsoDuration = string

/**
 * ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 */
export type CurrencyCode = string

/**
 * Provider-specific opaque offer identifier. Identifier scheme is
 * provider-defined and MUST NOT be parsed by consumers.
 */
export type OfferId = string

/**
 * Geographic point used for radius-based search of hotels, activities
 * or car-rental locations.
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
   * Search radius around the point. Units are provider-defined but
   * SHOULD default to kilometres if not otherwise specified by the
   * provider.
   */
  radius?: number
}

/**
 * Traveler-count breakdown supplied to {@link TravelProvider.searchTripOptions}.
 */
export interface TravelerCounts {
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

/**
 * Monetary price block. Always carries an explicit currency.
 */
export interface MoneyAmount {
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

/**
 * One leg of a flight offer — a single take-off / landing pair on a
 * single operated flight.
 */
export interface FlightSegment {
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

/**
 * Departure or arrival point on a {@link FlightSegment}.
 */
export interface FlightSegmentEndpoint {
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

/**
 * Normalized flight offer surfaced inside a {@link TripSearchResult}.
 *
 * This is a minimal, travel-core-local shape — not the same TypeScript
 * type as `@molecule/api-flights`'s `FlightOffer`. Providers that wrap
 * the flights core MAY convert between the two structurally.
 */
export interface FlightOffer {
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

/**
 * Normalized hotel offer surfaced inside a {@link TripSearchResult}.
 */
export interface HotelOffer {
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

/**
 * Normalized car-rental offer surfaced inside a {@link TripSearchResult}.
 *
 * Most major travel aggregators expose car offers as a separate vertical;
 * the trip facade includes them so itinerary planners can present a
 * unified "ground transport" line item alongside flights and hotels.
 */
export interface CarOffer {
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

/**
 * Normalized activity / experience offer (e.g. a museum tour, food
 * walk, day trip) surfaced inside a {@link TripSearchResult}.
 */
export interface ActivityOffer {
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

/**
 * Search criteria for {@link TravelProvider.searchTripOptions}.
 *
 * The criteria are deliberately broad: travelers typically want to see
 * flights + hotels + cars + activities all at once when planning a
 * trip, so the same date / origin / destination apply to each. Per-
 * vertical filtering (cabin, hotel rating, etc.) is left to follow-up
 * calls against the per-vertical cores.
 */
export interface SearchTripOptions {
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

/**
 * Aggregated trip-search result returned by
 * {@link TravelProvider.searchTripOptions}.
 *
 * Each per-vertical array is empty (NOT `undefined`) when the caller
 * did not opt in to that vertical or when the provider returned no
 * offers — this lets consumers iterate without conditional access
 * checks.
 */
export interface TripSearchResult {
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

/**
 * Search criteria for {@link TravelProvider.searchActivities}.
 *
 * Activities are typically scoped to a destination + date range and
 * filtered by the provider's own catalogue. Most providers expose
 * latitude / longitude search rather than IATA codes, so callers can
 * supply either form.
 */
export interface SearchActivitiesOptions {
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

/**
 * Search criteria for {@link TravelProvider.searchCars}.
 */
export interface SearchCarsOptions {
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

/**
 * Travel trip-planning provider interface.
 *
 * All travel providers (Amadeus, Travelport, Sabre, fixtures, etc.)
 * implement this interface. The interface is deliberately minimal and
 * aggregates across the per-vertical cores (`@molecule/api-flights`,
 * `@molecule/api-hotels`) so callers building "search a trip"
 * itinerary UIs can issue a single call and render mixed results.
 *
 * Providers that lack one of the vertical APIs (e.g. Amadeus does not
 * expose a public cars API as of v22) MUST return an empty array for
 * that vertical rather than throwing — the absence is data, not an
 * error.
 */
export interface TravelProvider {
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
