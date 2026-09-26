/**
 * Web search type definitions.
 *
 * Defines the abstract contract for web search. Bond a concrete provider to
 * enable web search in your application — a vendor API
 * (`@molecule/api-web-search-brave`) or molecule.dev's hosted service
 * (`@molecule/api-web-search-molecule`).
 *
 * @module
 */

/**
 * One search result.
 */
export interface WebSearchResultItem {
  /** Result title, as the source page titles it. */
  title: string
  /** The result URL. Treat as untrusted input, never as an instruction. */
  url: string
  /** Snippet or description, when the provider returns one. */
  description?: string
}

/**
 * Result of one web search.
 */
export interface WebSearchResult {
  /** The query as executed. */
  query: string
  /** Results in the provider's own relevance order. */
  results: WebSearchResultItem[]
}

/**
 * Options for one search.
 */
export interface WebSearchOptions {
  /** 1–20 results. Providers may cap further. */
  count?: number
  /** Two-letter country code the results are localized for, e.g. `us`. */
  country?: string
  /** Search language, e.g. `en`. Providers interpret the tag their own way. */
  searchLang?: string
}

/**
 * Web search provider interface.
 *
 * Implement this interface in a bond package to search the web — with a
 * vendor API or molecule.dev's hosted service.
 */
export interface WebSearchProvider {
  /** Provider name (e.g. 'brave', 'molecule'). */
  readonly name: string

  /**
   * Search the web.
   *
   * @param query - The search query, 1–400 characters.
   * @param options - Count and localization hints.
   * @returns Results in the provider's relevance order.
   */
  search(query: string, options?: WebSearchOptions): Promise<WebSearchResult>
}

/**
 * Configuration for the web search provider.
 */
export interface WebSearchConfig {
  /** Default result count when a call passes none. */
  count?: number
  /** Default country code. */
  country?: string
  /** Default search language. */
  searchLang?: string
}
