/**
 * Stability AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Stability AI image generation provider.
 */
export interface StabilityConfig {
  /** Stability AI API key. Defaults to STABILITY_API_KEY env var. */
  apiKey?: string
  /** Default generation model. Defaults to 'sd3.5-large'. */
  defaultModel?: string
  /** Base URL for the Stability AI API. Defaults to 'https://api.stability.ai'. */
  baseUrl?: string
  /** Maximum number of retry attempts for transient failures. Defaults to 3. */
  maxRetries?: number
}
