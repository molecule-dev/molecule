/**
 * Google Gemini AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Google Gemini AI provider.
 */
export interface GoogleConfig {
  /** API key. Defaults to the `GOOGLE_AI_API_KEY` env var. */
  apiKey?: string
  /**
   * Base URL override (for proxies / gateways). Defaults to the
   * `GOOGLE_AI_BASE_URL` env var, then Google's public Generative Language
   * endpoint (`https://generativelanguage.googleapis.com/v1beta`).
   */
  baseUrl?: string
  /**
   * Default model id when not overridden per-request. Defaults to the
   * `GOOGLE_AI_MODEL` env var, then `gemini-2.0-flash`.
   */
  model?: string
}

/**
 * Process env vars read by the Google Gemini AI bond.
 */
export interface ProcessEnv {
  /** Google AI (Gemini) API key. */
  GOOGLE_AI_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  GOOGLE_AI_BASE_URL?: string
  /** Default model id override. */
  GOOGLE_AI_MODEL?: string
}
