/**
 * Jev decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Jev decisions provider.
 */
export interface JevConfig {
  /** TypeSafe API key. Defaults to the `TYPESAFE_API_KEY` env var (the name TypeSafe's own SDKs read). */
  apiKey?: string
  /**
   * API base URL. Defaults to `TYPESAFE_BASE_URL`, then `https://api.typesafe.ai`.
   * Point it at a gateway that relays `/v1/systemone` (or at a `laya-serve`
   * host — same protocol) without changing code.
   */
  baseUrl?: string
  /** Default model id. Defaults to `'jev-latest'`. */
  model?: string
}
