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
