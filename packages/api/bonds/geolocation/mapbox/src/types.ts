/**
 * Mapbox geolocation provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Mapbox geolocation provider.
 */
export interface MapboxGeolocationConfig {
  /** Mapbox access token. Required. */
  accessToken: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 country code to bias results (e.g., `'US'`). */
  country?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /** Base URL override for proxied or self-hosted services. Defaults to `'https://api.mapbox.com'`. */
  baseUrl?: string
}
