/**
 * AIVectorStore provider interface.
 *
 * Defines the contract for vector database operations — storing, querying,
 * and managing embedding vectors with associated metadata. Implement this
 * interface in a bond package (e.g., `@molecule/api-ai-vector-store-pgvector`).
 *
 * @module
 */

/**
 * A stored vector record with its embedding, metadata, and optional content.
 */
export interface VectorRecord {
  /** Unique identifier for this vector record. */
  id: string
  /** The embedding vector (array of floats). */
  embedding: number[]
  /** Arbitrary metadata associated with this vector. */
  metadata?: Record<string, unknown>
  /** Optional text content that produced this embedding. */
  content?: string
}

/**
 * Input for upserting a vector record. Same as VectorRecord but embedding is optional
 * when the store handles embedding generation internally.
 */
export interface VectorRecordInput {
  /** Unique identifier for this vector record. */
  id: string
  /** The embedding vector (array of floats). */
  embedding: number[]
  /** Arbitrary metadata associated with this vector. */
  metadata?: Record<string, unknown>
  /** Optional text content that produced this embedding. */
  content?: string
}

/**
 * A result from a similarity search query.
 */
export interface VectorSearchResult {
  /** The matched vector record. */
  record: VectorRecord
  /** Similarity score (higher is more similar, normalized 0–1 when possible). */
  score: number
}

/**
 * Metadata filter operators for querying vectors.
 */
export type MetadataFilter =
  | { field: string; operator: 'eq'; value: string | number | boolean }
  | { field: string; operator: 'ne'; value: string | number | boolean }
  | { field: string; operator: 'gt'; value: number }
  | { field: string; operator: 'gte'; value: number }
  | { field: string; operator: 'lt'; value: number }
  | { field: string; operator: 'lte'; value: number }
  | { field: string; operator: 'in'; value: (string | number)[] }

/**
 * Parameters for similarity search queries.
 */
export interface VectorQueryParams {
  /** The query embedding vector to find similar vectors for. */
  embedding: number[]
  /** Maximum number of results to return. Defaults to 10. */
  topK?: number
  /** Optional metadata filters to narrow results. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold (0–1). Results below this are excluded. */
  minScore?: number
  /** The collection/namespace to query. */
  collection: string
}

/**
 * Parameters for upserting vectors.
 */
export interface VectorUpsertParams {
  /** The collection/namespace to upsert into. */
  collection: string
  /** Vector records to upsert. */
  records: VectorRecordInput[]
}

/**
 * Parameters for deleting vectors.
 */
export interface VectorDeleteParams {
  /** The collection/namespace to delete from. */
  collection: string
  /** IDs of vectors to delete. */
  ids: string[]
}

/**
 * Parameters for fetching vectors by ID.
 */
export interface VectorFetchParams {
  /** The collection/namespace to fetch from. */
  collection: string
  /** IDs of vectors to fetch. */
  ids: string[]
}

/**
 * Distance metric for similarity calculations.
 */
export type DistanceMetric = 'cosine' | 'euclidean' | 'inner_product'

/**
 * Parameters for creating a collection/namespace.
 */
export interface CreateCollectionParams {
  /** Name of the collection to create. */
  name: string
  /** Dimensionality of vectors in this collection. */
  dimension: number
  /** Distance metric for similarity search. Defaults to 'cosine'. */
  metric?: DistanceMetric
}

/**
 * AIVectorStore provider interface.
 *
 * Each bond package (pgvector, Pinecone, Chroma, etc.) implements
 * this interface to provide vector database operations.
 */
export interface AIVectorStoreProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Create a new collection/namespace for storing vectors.
   *
   * @param params - Collection creation parameters.
   */
  createCollection(params: CreateCollectionParams): Promise<void>

  /**
   * Delete a collection/namespace and all its vectors.
   *
   * @param name - Name of the collection to delete.
   */
  deleteCollection(name: string): Promise<void>

  /**
   * List all available collections.
   *
   * @returns Array of collection names.
   */
  listCollections(): Promise<string[]>

  /**
   * Upsert (insert or update) vector records into a collection.
   *
   * @param params - Upsert parameters including collection and records.
   */
  upsert(params: VectorUpsertParams): Promise<void>

  /**
   * Query for similar vectors using a query embedding.
   *
   * @param params - Query parameters including embedding, topK, and filters.
   * @returns Array of search results sorted by similarity (highest first).
   */
  query(params: VectorQueryParams): Promise<VectorSearchResult[]>

  /**
   * Fetch vector records by their IDs.
   *
   * @param params - Fetch parameters including collection and IDs.
   * @returns Array of found vector records (missing IDs are omitted).
   */
  fetch(params: VectorFetchParams): Promise<VectorRecord[]>

  /**
   * Delete vector records by their IDs.
   *
   * @param params - Delete parameters including collection and IDs.
   */
  delete(params: VectorDeleteParams): Promise<void>
}

/**
 * Base configuration for vector store providers.
 */
export interface AIVectorStoreConfig {
  /** Connection string or URL for the vector store. */
  connectionString?: string
  /** API key for managed vector store services. */
  apiKey?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
