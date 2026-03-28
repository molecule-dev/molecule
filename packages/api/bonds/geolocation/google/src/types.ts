/**
 * Google Maps geolocation provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Google Maps geolocation provider.
 */
export interface GoogleGeolocationConfig {
  /** Google Maps API key. Required. */
  apiKey: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 region code to bias results (e.g., `'US'`). */
  region?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /** Base URL override for proxied or self-hosted services. Defaults to `'https://maps.googleapis.com'`. */
  baseUrl?: string
}
