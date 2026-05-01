/**
 * OpenWeather weather provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the OpenWeather (One Call API 3.0) provider.
 *
 * The One Call API endpoint
 * (`https://api.openweathermap.org/data/3.0/onecall`) requires an API key
 * issued from the OpenWeather dashboard. The free "One Call by Call" tier
 * is sufficient for development and most flagship demos.
 */
export interface OpenWeatherConfig {
  /**
   * Base URL override. Defaults to
   * `'https://api.openweathermap.org/data/3.0'`. Useful for routing
   * traffic through an internal proxy or staging gateway.
   */
  baseUrl?: string

  /**
   * OpenWeather API key, sent as the `appid` query parameter. When
   * omitted, the provider falls back to `process.env.OPENWEATHER_API_KEY`
   * at first request. The active provider MUST have an API key
   * configured before any of its methods are invoked.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
