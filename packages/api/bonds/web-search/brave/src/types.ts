/**
 * Configuration types for the Brave web search provider.
 *
 * @module
 */

/**
 * Options for {@link createProvider}. Every field falls back to an env var or
 * Brave's documented default.
 */
export interface BraveWebSearchConfig {
  /**
   * The Brave Search API subscription token. Defaults to
   * `BRAVE_SEARCH_API_KEY`. Create one at https://brave.com/search/api/ —
   * the Search plan includes free monthly credits.
   */
  apiKey?: string
  /** API base URL. Defaults to `https://api.search.brave.com`. */
  baseUrl?: string
  /** Per-request timeout in milliseconds. Default 15000. */
  timeoutMs?: number
  /** Default result count when a call passes none. Default 5. */
  count?: number
  /** Default country code, e.g. `us`. */
  country?: string
  /** Default search language, e.g. `en`. */
  searchLang?: string
}

/** Environment variables this provider reads. */
export interface ProcessEnv {
  BRAVE_SEARCH_API_KEY?: string
}
