/**
 * In-memory implementation of AIVectorStoreProvider.
 *
 * Stores every collection and its vectors in a module-level `Map`, and scores
 * queries with a brute-force scan over all records (cosine, euclidean, or inner
 * product). Zero external dependencies — intended for tests, local development,
 * and small datasets where a real vector database is overkill. All state lives
 * in the process and is lost on restart.
 *
 * @module
 */

import type {
  AIVectorStoreProvider,
  CreateCollectionParams,
  DistanceMetric,
  MetadataFilter,
  VectorDeleteParams,
  VectorFetchParams,
  VectorQueryParams,
  VectorRecord,
  VectorSearchResult,
  VectorUpsertParams,
} from '@molecule/api-ai-vector-store'

/**
 * A single in-memory collection: its fixed dimension, distance metric, and the
 * records it holds keyed by id.
 */
interface MemoryCollection {
  /** Fixed dimensionality every record's embedding must match. */
  dimension: number
  /** Distance metric used to score queries against this collection. */
  metric: DistanceMetric
  /** Stored records keyed by record id. */
  records: Map<string, VectorRecord>
}

/** Module-level store of all collections, keyed by collection name. */
const store = new Map<string, MemoryCollection>()

/**
 * Dot product of two equal-length vectors.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The sum of element-wise products.
 */
function dotProduct(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

/**
 * Euclidean (L2) distance between two equal-length vectors.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The straight-line distance between the two points.
 */
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Cosine similarity between two vectors, in the range [-1, 1]. Guards against
 * zero-magnitude vectors (which have no defined direction) by returning 0 rather
 * than dividing by zero and producing NaN.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The cosine similarity, or 0 if either vector has zero magnitude.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const magnitude = Math.sqrt(dotProduct(a, a)) * Math.sqrt(dotProduct(b, b))
  if (magnitude === 0) return 0
  return dotProduct(a, b) / magnitude
}

/**
 * Scores a stored embedding against the query embedding for a given metric,
 * normalizing so that higher is always more similar. Cosine maps [-1, 1] onto
 * [0, 1] as `(cos + 1) / 2`; euclidean maps distance onto (0, 1] as
 * `1 / (1 + distance)`; inner product returns the raw dot product.
 *
 * @param query - The query embedding.
 * @param embedding - The stored record's embedding.
 * @param metric - The collection's distance metric.
 * @returns The similarity score (higher is more similar).
 */
function scoreEmbedding(query: number[], embedding: number[], metric: DistanceMetric): number {
  switch (metric) {
    case 'cosine':
      return (cosineSimilarity(query, embedding) + 1) / 2
    case 'inner_product':
      return dotProduct(query, embedding)
    case 'euclidean':
      return 1 / (1 + euclideanDistance(query, embedding))
  }
}

/**
 * Tests whether a record's metadata satisfies every filter. All filters must
 * pass (logical AND). A record missing the filtered field always fails, for
 * every operator (including `ne`). Comparison operators (`gt`/`gte`/`lt`/`lte`)
 * fail when the stored value is not a number.
 *
 * @param metadata - The record's metadata, or undefined if it has none.
 * @param filters - The filters that must all pass.
 * @returns True if the record passes every filter.
 */
function passesFilters(
  metadata: Record<string, unknown> | undefined,
  filters: MetadataFilter[],
): boolean {
  for (const filter of filters) {
    if (!metadata || !(filter.field in metadata)) return false
    const value = metadata[filter.field]
    switch (filter.operator) {
      case 'eq':
        if (value !== filter.value) return false
        break
      case 'ne':
        if (value === filter.value) return false
        break
      case 'gt':
        if (typeof value !== 'number' || value <= filter.value) return false
        break
      case 'gte':
        if (typeof value !== 'number' || value < filter.value) return false
        break
      case 'lt':
        if (typeof value !== 'number' || value >= filter.value) return false
        break
      case 'lte':
        if (typeof value !== 'number' || value > filter.value) return false
        break
      case 'in':
        if (!filter.value.some((candidate) => candidate === value)) return false
        break
    }
  }
  return true
}

/**
 * Produces an independent copy of a record so callers can't mutate stored state
 * (and stored state can't be mutated through a returned reference). The
 * embedding array and metadata object are shallow-cloned; ids and content are
 * primitives.
 *
 * @param record - The record to copy.
 * @returns A new record with a fresh embedding array and metadata object.
 */
function cloneRecord(record: VectorRecord): VectorRecord {
  const copy: VectorRecord = { id: record.id, embedding: [...record.embedding] }
  if (record.metadata !== undefined) copy.metadata = { ...record.metadata }
  if (record.content !== undefined) copy.content = record.content
  return copy
}

/**
 * In-memory vector store provider.
 *
 * Implements the `AIVectorStoreProvider` interface with process-local state and
 * a brute-force similarity scan. No persistence, no external services.
 */
export const provider: AIVectorStoreProvider = {
  name: 'memory',

  /**
   * Create a new collection. Idempotent when the collection already exists with
   * the same dimension (a no-op); throws if it exists with a different
   * dimension. Metric defaults to 'cosine'.
   *
   * @param params - Collection creation parameters.
   * @throws {Error} if the collection already exists with a different dimension.
   */
  async createCollection(params: CreateCollectionParams): Promise<void> {
    const existing = store.get(params.name)
    if (existing) {
      if (existing.dimension !== params.dimension) {
        throw new Error(
          `Collection "${params.name}" already exists with dimension ${existing.dimension}, ` +
            `cannot recreate with dimension ${params.dimension}`,
        )
      }
      return
    }
    store.set(params.name, {
      dimension: params.dimension,
      metric: params.metric ?? 'cosine',
      records: new Map(),
    })
  },

  /**
   * Delete a collection and all its vectors. No-op if the collection does not
   * exist.
   *
   * @param name - Name of the collection to delete.
   */
  async deleteCollection(name: string): Promise<void> {
    store.delete(name)
  },

  /**
   * List all collection names, sorted for deterministic output.
   *
   * @returns Array of collection names.
   */
  async listCollections(): Promise<string[]> {
    return [...store.keys()].sort()
  },

  /**
   * Upsert (insert or replace by id) vector records into a collection. Validates
   * every record's embedding length against the collection dimension before
   * writing any of them, so a mismatch leaves the collection unchanged.
   *
   * @param params - Upsert parameters including collection and records.
   * @throws {Error} if the collection does not exist or an embedding's length
   *   does not match the collection dimension.
   */
  async upsert(params: VectorUpsertParams): Promise<void> {
    const collection = store.get(params.collection)
    if (!collection) {
      throw new Error(`Collection "${params.collection}" does not exist`)
    }
    for (const record of params.records) {
      if (record.embedding.length !== collection.dimension) {
        throw new Error(
          `Embedding for record "${record.id}" has length ${record.embedding.length}, ` +
            `expected ${collection.dimension} for collection "${params.collection}"`,
        )
      }
    }
    for (const record of params.records) {
      collection.records.set(record.id, cloneRecord(record))
    }
  },

  /**
   * Query for similar vectors with a brute-force scan: score every record by the
   * collection's metric, drop records that fail any metadata filter or fall
   * below `minScore`, sort by score descending, and return the top `topK`
   * (default 10). Each result carries an independent copy of the record.
   *
   * @param params - Query parameters including embedding, topK, filters, and minScore.
   * @returns Results sorted by similarity (highest first).
   * @throws {Error} if the collection does not exist.
   */
  async query(params: VectorQueryParams): Promise<VectorSearchResult[]> {
    const collection = store.get(params.collection)
    if (!collection) {
      throw new Error(`Collection "${params.collection}" does not exist`)
    }

    const topK = params.topK ?? 10
    const results: VectorSearchResult[] = []

    for (const record of collection.records.values()) {
      if (params.filter && !passesFilters(record.metadata, params.filter)) continue
      const score = scoreEmbedding(params.embedding, record.embedding, collection.metric)
      if (params.minScore !== undefined && score < params.minScore) continue
      results.push({ record: cloneRecord(record), score })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  },

  /**
   * Fetch records by id. Missing ids are omitted from the result. A missing
   * collection yields an empty array.
   *
   * @param params - Fetch parameters including collection and ids.
   * @returns The found records (each an independent copy).
   */
  async fetch(params: VectorFetchParams): Promise<VectorRecord[]> {
    const collection = store.get(params.collection)
    if (!collection) return []

    const found: VectorRecord[] = []
    for (const id of params.ids) {
      const record = collection.records.get(id)
      if (record) found.push(cloneRecord(record))
    }
    return found
  },

  /**
   * Delete records by id. Missing ids are ignored; a missing collection is a
   * no-op.
   *
   * @param params - Delete parameters including collection and ids.
   */
  async delete(params: VectorDeleteParams): Promise<void> {
    const collection = store.get(params.collection)
    if (!collection) return
    for (const id of params.ids) {
      collection.records.delete(id)
    }
  },
}
