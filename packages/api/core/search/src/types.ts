/**
 * Type definitions for search core interface.
 *
 * @module
 */

/**
 * Field type for index schema definitions.
 */
export type FieldType = 'text' | 'keyword' | 'number' | 'boolean' | 'date' | 'geo'

/**
 * Schema definition for a search index, describing the fields and their roles.
 */
export interface IndexSchema {
  /**
   * Map of field names to their types.
   */
  fields: Record<string, FieldType>

  /**
   * Fields that are searchable via full-text queries.
   */
  searchableFields?: string[]

  /**
   * Fields that can be used in filter expressions.
   */
  filterableFields?: string[]

  /**
   * Fields that can be used for sorting results.
   */
  sortableFields?: string[]
}

/**
 * A document to be indexed in a bulk operation.
 */
export interface IndexDocument {
  /**
   * Unique identifier for the document.
   */
  id: string

  /**
   * The document fields and values.
   */
  document: Record<string, unknown>
}

/**
 * Result of a bulk index operation.
 */
export interface BulkIndexResult {
  /**
   * Number of documents successfully indexed.
   */
  indexed: number

  /**
   * Number of documents that failed to index.
   */
  failed: number

  /**
   * Errors encountered during bulk indexing, keyed by document id.
   */
  errors: Record<string, string>
}

/**
 * Sort direction for search results.
 */
export type SortDirection = 'asc' | 'desc'

/**
 * A field to sort search results by.
 */
export interface SortField {
  /**
   * The field name to sort on.
   */
  field: string

  /**
   * Sort direction.
   */
  direction: SortDirection
}

/**
 * A full-text search query with optional filters, facets, sorting, and pagination.
 */
export interface SearchQuery {
  /**
   * The search text.
   */
  text: string

  /**
   * Filter expressions to narrow results.
   */
  filters?: Record<string, unknown>

  /**
   * Fields to compute facet counts for.
   */
  facets?: string[]

  /**
   * Sort fields and directions.
   */
  sort?: SortField[]

  /**
   * Page number (1-based).
   */
  page?: number

  /**
   * Number of results per page.
   */
  perPage?: number

  /**
   * Whether to include highlighted snippets in results.
   */
  highlight?: boolean
}

/**
 * A single facet count entry.
 */
export interface FacetCount {
  /**
   * The facet value.
   */
  value: string

  /**
   * Number of documents matching this facet value.
   */
  count: number
}

/**
 * A single search result hit.
 */
export interface SearchHit {
  /**
   * Document identifier.
   */
  id: string

  /**
   * Relevance score.
   */
  score: number

  /**
   * The matched document fields.
   */
  document: Record<string, unknown>

  /**
   * Highlighted field snippets, keyed by field name.
   */
  highlights?: Record<string, string[]>
}

/**
 * The result of a search query, including hits, pagination, facets, and timing.
 */
export interface SearchResult {
  /**
   * Matched documents.
   */
  hits: SearchHit[]

  /**
   * Total number of matching documents.
   */
  total: number

  /**
   * Current page number.
   */
  page: number

  /**
   * Number of results per page.
   */
  perPage: number

  /**
   * Facet counts keyed by field name.
   */
  facets?: Record<string, FacetCount[]>

  /**
   * Time taken to process the query in milliseconds.
   */
  processingTimeMs: number
}

/**
 * Options for typeahead / autocomplete suggestions.
 */
export interface SuggestOptions {
  /**
   * Maximum number of suggestions to return.
   */
  limit?: number

  /**
   * Fields to generate suggestions from.
   */
  fields?: string[]

  /**
   * Whether to apply fuzzy matching.
   */
  fuzzy?: boolean
}

/**
 * A single autocomplete suggestion.
 */
export interface Suggestion {
  /**
   * The suggested text.
   */
  text: string

  /**
   * Relevance score for ranking suggestions.
   */
  score: number

  /**
   * Optional highlighted version of the suggestion.
   */
  highlighted?: string
}

/**
 * Search provider interface.
 *
 * All search providers must implement this interface to provide full-text
 * search, indexing, and suggestion capabilities.
 */
export interface SearchProvider {
  /**
   * Creates a search index with an optional schema.
   *
   * @param name - Index name.
   * @param schema - Optional schema describing field types and roles.
   */
  createIndex(name: string, schema?: IndexSchema): Promise<void>

  /**
   * Deletes a search index and all its documents.
   *
   * @param name - Index name to delete.
   */
  deleteIndex(name: string): Promise<void>

  /**
   * Indexes a single document.
   *
   * @param indexName - Target index name.
   * @param id - Unique document identifier.
   * @param document - The document fields and values.
   */
  index(indexName: string, id: string, document: Record<string, unknown>): Promise<void>

  /**
   * Indexes multiple documents in a single operation.
   *
   * @param indexName - Target index name.
   * @param documents - Array of documents to index.
   * @returns Result with indexed/failed counts and errors.
   */
  bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult>

  /**
   * Executes a full-text search query against an index.
   *
   * @param indexName - Index to search.
   * @param query - Search query with text, filters, pagination, etc.
   * @returns Search results with hits, total count, facets, and timing.
   */
  search(indexName: string, query: SearchQuery): Promise<SearchResult>

  /**
   * Deletes a document from an index by id.
   *
   * @param indexName - Index containing the document.
   * @param id - Document identifier to delete.
   */
  delete(indexName: string, id: string): Promise<void>

  /**
   * Returns typeahead/autocomplete suggestions for a partial query.
   *
   * @param indexName - Index to generate suggestions from.
   * @param query - Partial text to complete.
   * @param options - Suggestion options (limit, fields, fuzzy).
   * @returns Array of suggestions sorted by relevance.
   */
  suggest(indexName: string, query: string, options?: SuggestOptions): Promise<Suggestion[]>

  /**
   * Retrieves a single document from an index by id.
   *
   * @param indexName - Index containing the document.
   * @param id - Document identifier.
   * @returns The document fields, or `null` if not found.
   */
  getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null>
}
