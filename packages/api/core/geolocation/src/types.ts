/**
 * Type definitions for geolocation core interface.
 *
 * @module
 */

/**
 * Distance unit for calculations.
 */
export type DistanceUnit = 'km' | 'mi'

/**
 * A latitude/longitude coordinate pair.
 */
export interface LatLng {
  /** Latitude in decimal degrees. */
  lat: number

  /** Longitude in decimal degrees. */
  lng: number
}

/**
 * Structured address components returned from geocoding operations.
 */
export interface AddressComponents {
  /** Street number (e.g., `'123'`). */
  streetNumber?: string

  /** Street name (e.g., `'Main St'`). */
  street?: string

  /** City or locality name. */
  city?: string

  /** State or region name. */
  state?: string

  /** State or region abbreviation. */
  stateCode?: string

  /** Country name. */
  country?: string

  /** ISO 3166-1 alpha-2 country code (e.g., `'US'`). */
  countryCode?: string

  /** Postal/ZIP code. */
  postalCode?: string

  /** County or district. */
  county?: string

  /** Neighborhood or suburb. */
  neighborhood?: string
}

/**
 * A geocoding result, mapping an address to coordinates.
 */
export interface GeoResult {
  /** Latitude in decimal degrees. */
  lat: number

  /** Longitude in decimal degrees. */
  lng: number

  /** Full formatted address string. */
  formattedAddress: string

  /** Structured address components. */
  components: AddressComponents

  /** Provider-specific place identifier. */
  placeId?: string

  /** Bounding box of the result, if available. */
  bounds?: {
    /** Northeast corner. */
    northeast: LatLng
    /** Southwest corner. */
    southwest: LatLng
  }
}

/**
 * Options for autocomplete/place suggestion queries.
 */
export interface AutocompleteOptions {
  /** Bias results toward this location. */
  location?: LatLng

  /** Radius in meters to bias results within. */
  radius?: number

  /** ISO 3166-1 alpha-2 country codes to restrict results to. */
  countries?: string[]

  /** Maximum number of results to return. */
  limit?: number

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** Session token for grouping related autocomplete requests (billing optimization). */
  sessionToken?: string
}

/**
 * A place suggestion returned by autocomplete.
 */
export interface PlaceSuggestion {
  /** Provider-specific place identifier. */
  placeId: string

  /** Primary text describing the place (e.g., street name). */
  mainText: string

  /** Secondary text describing the place (e.g., city, state). */
  secondaryText: string

  /** Full description of the place. */
  description: string

  /** Location coordinates, if available without an additional API call. */
  location?: LatLng
}

/**
 * Timezone information for a location.
 */
export interface TimezoneInfo {
  /** IANA timezone identifier (e.g., `'America/New_York'`). */
  timeZoneId: string

  /** Display name of the timezone (e.g., `'Eastern Standard Time'`). */
  timeZoneName: string

  /** UTC offset in seconds for standard time. */
  rawOffset: number

  /** Additional DST offset in seconds (0 if not in DST). */
  dstOffset: number
}

/**
 * Geolocation provider interface.
 *
 * All geolocation providers must implement this interface.
 * Bond packages (Google Maps, Mapbox, Nominatim, etc.) provide concrete implementations.
 */
export interface GeolocationProvider {
  /**
   * Converts a street address or place name to geographic coordinates.
   *
   * @param address - The address or place name to geocode.
   * @returns An array of matching results, ordered by relevance.
   */
  geocode(address: string): Promise<GeoResult[]>

  /**
   * Converts geographic coordinates to a human-readable address.
   *
   * @param lat - Latitude in decimal degrees.
   * @param lng - Longitude in decimal degrees.
   * @returns An array of matching address results, ordered by specificity.
   */
  reverseGeocode(lat: number, lng: number): Promise<GeoResult[]>

  /**
   * Calculates the great-circle distance between two points using the Haversine formula.
   *
   * This is a pure calculation and does not require an API call.
   *
   * @param from - The starting coordinate.
   * @param to - The ending coordinate.
   * @param unit - The unit of measurement. Defaults to `'km'`.
   * @returns The distance between the two points.
   */
  distance(from: LatLng, to: LatLng, unit?: DistanceUnit): number

  /**
   * Returns place suggestions for a partial query string (typeahead).
   *
   * Not all providers support autocomplete. If unsupported, this method
   * should return an empty array or throw with a descriptive message.
   *
   * @param query - The partial query string.
   * @param options - Options to bias or restrict results.
   * @returns An array of place suggestions.
   */
  autocomplete?(query: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]>

  /**
   * Returns timezone information for a geographic coordinate.
   *
   * Not all providers support timezone lookups. If unsupported, this method
   * should throw with a descriptive message.
   *
   * @param lat - Latitude in decimal degrees.
   * @param lng - Longitude in decimal degrees.
   * @returns Timezone information for the location.
   */
  getTimezone?(lat: number, lng: number): Promise<TimezoneInfo>
}

/**
 * Configuration options for geolocation providers.
 */
export interface GeolocationConfig {
  /** API key for the geolocation service. */
  apiKey?: string

  /** Base URL override for self-hosted or proxied services. */
  baseUrl?: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 region code to bias results (e.g., `'US'`). */
  region?: string

  /** Request timeout in milliseconds. */
  timeout?: number
}
