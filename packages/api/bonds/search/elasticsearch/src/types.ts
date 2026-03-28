/**
 * Type definitions for the Elasticsearch search provider.
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
 * Configuration options for the Elasticsearch search provider.
 */
export interface ElasticsearchOptions {
  /**
   * Elasticsearch node URL.
   *
   * @default process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200'
   */
  node?: string

  /**
   * Optional API key for authentication.
   *
   * @default process.env.ELASTICSEARCH_API_KEY
   */
  apiKey?: string

  /**
   * Optional username for basic authentication.
   *
   * @default process.env.ELASTICSEARCH_USERNAME
   */
  username?: string

  /**
   * Optional password for basic authentication.
   *
   * @default process.env.ELASTICSEARCH_PASSWORD
   */
  password?: string

  /**
   * Request timeout in milliseconds.
   *
   * @default 30000
   */
  requestTimeout?: number

  /**
   * Maximum number of retries for failed requests.
   *
   * @default 3
   */
  maxRetries?: number

  /**
   * Index name prefix to namespace indices.
   */
  indexPrefix?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      ELASTICSEARCH_URL?: string
      ELASTICSEARCH_API_KEY?: string
      ELASTICSEARCH_USERNAME?: string
      ELASTICSEARCH_PASSWORD?: string
    }
  }
}
