/**
 * Type definitions for the Typesense search provider.
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
 * Configuration options for the Typesense search provider.
 */
export interface TypesenseOptions {
  /**
   * Typesense node URL(s).
   *
   * @default [{ host: process.env.TYPESENSE_HOST ?? 'localhost', port: Number(process.env.TYPESENSE_PORT ?? 8108), protocol: process.env.TYPESENSE_PROTOCOL ?? 'http' }]
   */
  nodes?: Array<{ host: string; port: number; protocol: string }>

  /**
   * Typesense API key for authentication.
   *
   * @default process.env.TYPESENSE_API_KEY
   */
  apiKey?: string

  /**
   * Connection timeout in milliseconds.
   *
   * @default 5000
   */
  connectionTimeoutSeconds?: number

  /**
   * Number of retries for failed requests.
   *
   * @default 3
   */
  numRetries?: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      TYPESENSE_HOST?: string
      TYPESENSE_PORT?: string
      TYPESENSE_PROTOCOL?: string
      TYPESENSE_API_KEY?: string
    }
  }
}
