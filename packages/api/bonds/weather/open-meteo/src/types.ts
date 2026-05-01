/**
 * Open-Meteo weather provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the Open-Meteo weather provider.
 *
 * Open-Meteo's public forecast endpoint
 * (`https://api.open-meteo.com/v1/forecast`) is keyless and free for
 * non-commercial use, so all fields are optional.
 */
export interface OpenMeteoWeatherConfig {
  /**
   * Base URL override. Defaults to `'https://api.open-meteo.com/v1'`.
   * Useful for self-hosted Open-Meteo instances or for the commercial
   * `customer-api.open-meteo.com` endpoint.
   */
  baseUrl?: string

  /**
   * API key, sent as the `apikey` query parameter. Only required for the
   * commercial customer endpoint; ignored by the public service.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number

  /**
   * Default IANA timezone used when {@link WeatherLocation.timezone} is
   * omitted. Defaults to `'auto'`, which lets Open-Meteo derive the
   * location's local timezone server-side.
   */
  defaultTimezone?: string
}
