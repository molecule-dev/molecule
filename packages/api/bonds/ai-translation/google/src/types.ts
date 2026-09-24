/**
 * Google Cloud Translation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Google Cloud Translation provider.
 */
export interface GoogleTranslateConfig {
  /** Google Cloud API key with the Cloud Translation API enabled. Defaults to GOOGLE_TRANSLATE_API_KEY. */
  apiKey?: string
  /** Base URL of the Translation API. Defaults to GOOGLE_TRANSLATE_BASE_URL, then 'https://translation.googleapis.com'. */
  baseUrl?: string
}
