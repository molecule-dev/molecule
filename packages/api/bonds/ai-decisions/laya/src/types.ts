/**
 * Laya decisions provider configuration.
 *
 * @module
 */

/**
 * Configuration for the Laya decisions provider.
 */
export interface LayaConfig {
  /** Base URL of the `laya-serve` host. Defaults to `LAYA_URL`, then `http://localhost:8000`. */
  baseUrl?: string
  /** Bearer token, when the server sets `LAYA_API_KEY`. Defaults to the `LAYA_API_KEY` env var. */
  apiKey?: string
  /**
   * Default checkpoint: `'english'`, `'multilingual'` or `'typed-decisions'`
   * (or a Hugging Face id such as `'convaiinnovations/laya-multilingual'`).
   * Omit to let the server route by the input's language.
   */
  model?: string
}
