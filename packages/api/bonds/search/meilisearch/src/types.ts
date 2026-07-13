/**
 * Type definitions for the Meilisearch search provider.
 *
 * @module
 */

export type {
  BulkIndexResult,
  FacetCount,
  FieldType,
  IndexDocument,
  IndexSchema,
  SearchHit,
  SearchProvider,
  SearchQuery,
  SearchResult,
  SortDirection,
  SortField,
  Suggestion,
  SuggestOptions,
} from '@molecule/api-search'

/**
 * Configuration options for the Meilisearch search provider.
 */
export interface MeilisearchOptions {
  /**
   * Meilisearch host URL.
   *
   * @default process.env.MEILISEARCH_URL ?? 'http://localhost:7700'
   */
  host?: string

  /**
   * Meilisearch API key for authentication.
   *
   * @default process.env.MEILISEARCH_API_KEY
   */
  apiKey?: string

  /**
   * How long (in milliseconds) to wait for a Meilisearch task (index/delete/
   * settings write) to finish before throwing a timeout error. The meilisearch
   * client's own default of 5000 ms routinely times out on realistic bulk
   * indexing, so this provider defaults to 30000 ms. Set `0` to wait forever.
   *
   * @default 30000
   */
  taskTimeoutMs?: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      MEILISEARCH_URL?: string
      MEILISEARCH_API_KEY?: string
    }
  }
}
