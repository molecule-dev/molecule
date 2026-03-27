/**
 * Type definitions for the PostgreSQL full-text search provider.
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
 * Configuration options for the PostgreSQL search provider.
 */
export interface PostgresSearchOptions {
  /**
   * PostgreSQL text search configuration (language).
   *
   * @default 'english'
   */
  searchConfig?: string

  /**
   * Table prefix for search index tables.
   *
   * @default 'search_'
   */
  tablePrefix?: string

  /**
   * Whether to use GIN indexes for faster text search.
   *
   * @default true
   */
  useGinIndex?: boolean
}
