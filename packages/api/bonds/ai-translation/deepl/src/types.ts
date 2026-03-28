/**
 * DeepL translation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the DeepL translation provider.
 */
export interface DeeplConfig {
  /** DeepL API key. Defaults to DEEPL_API_KEY env var. */
  apiKey?: string
  /**
   * Base URL for the DeepL API.
   * Defaults to 'https://api-free.deepl.com' for free keys (ending in ':fx'),
   * or 'https://api.deepl.com' for pro keys.
   */
  baseUrl?: string
  /** Default formality preference. Defaults to 'default'. */
  defaultFormality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
  /** Default model type preference. Defaults to 'latency_optimized'. */
  defaultModelType?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized'
}
