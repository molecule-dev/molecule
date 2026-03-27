/**
 * Nominatim geolocation provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Nominatim geolocation provider.
 */
export interface NominatimGeolocationConfig {
  /**
   * A valid HTTP `User-Agent` header identifying the application.
   * Required by the Nominatim Usage Policy for the public instance.
   * Self-hosted instances may not require this.
   */
  userAgent: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 country codes to restrict results to (e.g., `['US', 'CA']`). */
  countryCodes?: string[]

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /**
   * Base URL override for self-hosted Nominatim instances.
   * Defaults to `'https://nominatim.openstreetmap.org'`.
   */
  baseUrl?: string

  /**
   * Email address to include in requests (requested by the Nominatim Usage Policy
   * for heavy usage of the public instance).
   */
  email?: string

  /** Maximum number of results to return from search queries. Defaults to `10`. */
  limit?: number
}
