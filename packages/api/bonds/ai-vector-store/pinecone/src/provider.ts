/**
 * Pinecone implementation of AIVectorStoreProvider.
 *
 * Maps the molecule collection abstraction to Pinecone indexes. Each
 * collection becomes a separate serverless Pinecone index, prefixed
 * with a configurable string to avoid naming conflicts.
 *
 * @module
 */

import { Pinecone } from '@pinecone-database/pinecone'

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

import type { PineconeConfig } from './types.js'

/** Pinecone's metric names (uses 'dotproduct' instead of 'inner_product'). */
type PineconeMetric = 'cosine' | 'euclidean' | 'dotproduct'

/** Maximum vectors per upsert batch (Pinecone limit). */
const UPSERT_BATCH_SIZE = 100

/** Metadata key used to store the optional content field. */
const CONTENT_KEY = '_content'

/**
 * Converts a molecule distance metric to Pinecone's metric name.
 *
 * @param metric - Molecule distance metric.
 * @returns Pinecone-compatible metric string.
 */
function toPineconeMetric(metric: DistanceMetric): PineconeMetric {
  return metric === 'inner_product' ? 'dotproduct' : metric
}

/**
 * Converts a Pinecone metric name back to molecule's DistanceMetric.
 *
 * @param metric - Pinecone metric string.
 * @returns Molecule DistanceMetric.
 */
function fromPineconeMetric(metric: string): DistanceMetric {
  return metric === 'dotproduct' ? 'inner_product' : (metric as DistanceMetric)
}

/**
 * Builds a Pinecone metadata filter from molecule MetadataFilter array.
 *
 * @param filters - Array of molecule metadata filters.
 * @returns Pinecone-compatible filter object.
 */
function buildFilter(filters: MetadataFilter[]): Record<string, unknown> {
  const opMap: Record<string, string> = {
    eq: '$eq',
    ne: '$ne',
    gt: '$gt',
    gte: '$gte',
    lt: '$lt',
    lte: '$lte',
    in: '$in',
  }

  const conditions = filters.map((f) => ({
    [f.field]: { [opMap[f.operator]]: f.value },
  }))

  return conditions.length === 1 ? conditions[0] : { $and: conditions }
}

/**
 * Normalizes a Pinecone score to a 0–1 similarity range (higher is more similar).
 *
 * @param score - Raw score from Pinecone.
 * @param metric - The distance metric used.
 * @returns Normalized similarity score.
 */
function normalizeScore(score: number, metric: DistanceMetric): number {
  switch (metric) {
    case 'cosine':
      // Pinecone cosine already returns similarity (higher = more similar)
      return score
    case 'euclidean':
      // Pinecone euclidean returns distance; convert to similarity
      return 1 / (1 + score)
    case 'inner_product':
      // Pinecone dotproduct returns dot product value directly
      return score
  }
}

/**
 * Pinecone vector store provider.
 *
 * Implements the `AIVectorStoreProvider` interface using Pinecone's
 * serverless vector database. Each molecule collection maps to a
 * dedicated Pinecone index with a configurable name prefix.
 */
class PineconeProvider implements AIVectorStoreProvider {
  readonly name = 'pinecone'
  private client: Pinecone
  private cloud: 'aws' | 'gcp' | 'azure'
  private region: string
  private indexPrefix: string
  private defaultMetric: DistanceMetric
  private waitUntilReady: boolean
  private metricCache = new Map<string, DistanceMetric>()

  /**
   * Creates a new Pinecone provider.
   *
   * @param config - Provider configuration. API key defaults to PINECONE_API_KEY env var.
   */
  constructor(config: PineconeConfig = {}) {
    const apiKey = config.apiKey ?? process.env.PINECONE_API_KEY ?? ''
    this.client = new Pinecone({ apiKey })
    this.cloud = config.cloud ?? 'aws'
    this.region = config.region ?? 'us-east-1'
    this.indexPrefix = config.indexPrefix ?? 'mol-'
    this.defaultMetric = config.defaultMetric ?? 'cosine'
    this.waitUntilReady = config.waitUntilReady ?? true
  }

  /**
   * Returns the Pinecone index name for a molecule collection.
   *
   * @param collection - Collection name.
   * @returns Prefixed Pinecone index name.
   */
  private indexName(collection: string): string {
    return `${this.indexPrefix}${collection}`
  }

  /**
   * Strips the index prefix to recover the molecule collection name.
   *
   * @param pineconeIndexName - Pinecone index name.
   * @returns Collection name.
   */
  private collectionName(pineconeIndexName: string): string {
    return pineconeIndexName.slice(this.indexPrefix.length)
  }

  /**
   * Resolves the distance metric for a collection, using a cache to
   * avoid repeated describeIndex calls.
   *
   * @param collection - Collection name.
   * @returns The distance metric for this collection.
   */
  private async getMetric(collection: string): Promise<DistanceMetric> {
    const cached = this.metricCache.get(collection)
    if (cached) return cached

    const desc = await this.client.describeIndex(this.indexName(collection))
    const metric = fromPineconeMetric(desc.metric)
    this.metricCache.set(collection, metric)
    return metric
  }

  /**
   * Create a new collection backed by a Pinecone serverless index.
   *
   * @param params - Collection creation parameters.
   */
  async createCollection(params: CreateCollectionParams): Promise<void> {
    const metric = params.metric ?? this.defaultMetric

    await this.client.createIndex({
      name: this.indexName(params.name),
      dimension: params.dimension,
      metric: toPineconeMetric(metric),
      spec: {
        serverless: {
          cloud: this.cloud,
          region: this.region,
        },
      },
      waitUntilReady: this.waitUntilReady,
    })

    this.metricCache.set(params.name, metric)
  }

  /**
   * Delete a collection by deleting its corresponding Pinecone index.
   *
   * @param name - Name of the collection to delete.
   */
  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteIndex(this.indexName(name))
    this.metricCache.delete(name)
  }

  /**
   * List all collections by filtering Pinecone indexes with the configured prefix.
   *
   * @returns Array of collection names.
   */
  async listCollections(): Promise<string[]> {
    const response = await this.client.listIndexes()
    const indexes = response.indexes ?? []
    return indexes
      .filter((idx: { name: string }) => idx.name.startsWith(this.indexPrefix))
      .map((idx: { name: string }) => this.collectionName(idx.name))
      .sort()
  }

  /**
   * Upsert vector records into a collection. Records are batched in
   * groups of 100 to respect Pinecone's per-request limit.
   *
   * Content is stored as `_content` in vector metadata since Pinecone
   * has no dedicated content field.
   *
   * @param params - Upsert parameters including collection and records.
   */
  async upsert(params: VectorUpsertParams): Promise<void> {
    if (params.records.length === 0) return

    const index = this.client.index(this.indexName(params.collection))
    const records = params.records.map((record) => ({
      id: record.id,
      values: record.embedding,
      metadata: {
        ...(record.metadata as Record<string, string | number | boolean | string[]> | undefined),
        ...(record.content !== undefined ? { [CONTENT_KEY]: record.content } : {}),
      },
    }))

    for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
      await index.upsert({ records: records.slice(i, i + UPSERT_BATCH_SIZE) })
    }
  }

  /**
   * Query for similar vectors using the collection's configured distance metric.
   *
   * @param params - Query parameters including embedding, topK, and optional filters.
   * @returns Results sorted by similarity (highest first).
   */
  async query(params: VectorQueryParams): Promise<VectorSearchResult[]> {
    const index = this.client.index(this.indexName(params.collection))
    const topK = params.topK ?? 10
    const metric = await this.getMetric(params.collection)

    const queryOpts: {
      vector: number[]
      topK: number
      includeMetadata: boolean
      includeValues: boolean
      filter?: object
    } = {
      vector: params.embedding,
      topK,
      includeMetadata: true,
      includeValues: true,
    }

    if (params.filter && params.filter.length > 0) {
      queryOpts.filter = buildFilter(params.filter)
    }

    const response = await index.query(queryOpts)
    const matches = response.matches ?? []

    const results: VectorSearchResult[] = []
    for (const match of matches) {
      const score = normalizeScore(match.score ?? 0, metric)
      if (params.minScore !== undefined && score < params.minScore) continue

      const metadata = { ...(match.metadata ?? {}) } as Record<string, unknown>
      const content = metadata[CONTENT_KEY] as string | undefined
      delete metadata[CONTENT_KEY]

      results.push({
        record: {
          id: match.id,
          embedding: match.values ?? [],
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          content,
        },
        score,
      })
    }

    return results
  }

  /**
   * Fetch vector records by their IDs.
   *
   * @param params - Fetch parameters including collection and IDs.
   * @returns Found vector records (missing IDs are omitted).
   */
  async fetch(params: VectorFetchParams): Promise<VectorRecord[]> {
    if (params.ids.length === 0) return []

    const index = this.client.index(this.indexName(params.collection))
    const response = await index.fetch({ ids: params.ids })
    const records = response.records ?? {}

    return Object.values(records).map((record) => {
      const metadata = { ...(record.metadata ?? {}) } as Record<string, unknown>
      const content = metadata[CONTENT_KEY] as string | undefined
      delete metadata[CONTENT_KEY]

      return {
        id: record.id,
        embedding: record.values ?? [],
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        content,
      }
    })
  }

  /**
   * Delete vector records by their IDs.
   *
   * @param params - Delete parameters including collection and IDs.
   */
  async delete(params: VectorDeleteParams): Promise<void> {
    if (params.ids.length === 0) return

    const index = this.client.index(this.indexName(params.collection))
    await index.deleteMany({ ids: params.ids })
  }
}

/**
 * Creates a Pinecone vector store provider instance.
 *
 * @param config - Pinecone configuration.
 * @returns An `AIVectorStoreProvider` backed by Pinecone.
 */
export function createProvider(config?: PineconeConfig): AIVectorStoreProvider {
  return new PineconeProvider(config)
}
