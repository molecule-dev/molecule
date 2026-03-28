/**
 * ChromaDB implementation of AIVectorStoreProvider.
 *
 * Maps the molecule collection abstraction to ChromaDB collections. Each
 * molecule collection maps to a ChromaDB collection, prefixed with a
 * configurable string to avoid naming conflicts. Distance metrics are
 * mapped to ChromaDB's HNSW space parameter.
 *
 * @module
 */

import { ChromaClient, IncludeEnum } from 'chromadb'
import type { Where } from 'chromadb'

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

import type { ChromaConfig } from './types.js'

/** ChromaDB space names for distance metrics. */
type ChromaSpace = 'cosine' | 'l2' | 'ip'

/** Metadata key used to store the optional content field. */
const CONTENT_KEY = '_content'

/** Metadata key used to store the vector dimension for the collection. */
const DIMENSION_KEY = '_mol_dimension'

/** Metadata key used to store the distance metric for the collection. */
const METRIC_KEY = '_mol_metric'

/**
 * Converts a molecule distance metric to ChromaDB's HNSW space name.
 *
 * @param metric - Molecule distance metric.
 * @returns ChromaDB-compatible space string.
 */
function toChromaSpace(metric: DistanceMetric): ChromaSpace {
  switch (metric) {
    case 'cosine':
      return 'cosine'
    case 'euclidean':
      return 'l2'
    case 'inner_product':
      return 'ip'
  }
}

/**
 * Converts a ChromaDB distance to a similarity score (0–1, higher is more similar).
 *
 * @param distance - The raw distance from ChromaDB.
 * @param metric - The distance metric used.
 * @returns Normalized similarity score.
 */
function distanceToScore(distance: number, metric: DistanceMetric): number {
  switch (metric) {
    case 'cosine':
      // ChromaDB cosine distance = 1 - cosine_similarity
      return 1 - distance
    case 'euclidean':
      // Convert L2 distance to similarity: 1 / (1 + distance)
      return 1 / (1 + distance)
    case 'inner_product':
      // ChromaDB ip distance = negative inner product
      return -distance
  }
}

/**
 * Builds a ChromaDB `where` filter from molecule MetadataFilter array.
 *
 * @param filters - Array of molecule metadata filters.
 * @returns ChromaDB-compatible where object.
 */
function buildWhere(filters: MetadataFilter[]): Where {
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
  })) as Where[]

  return conditions.length === 1 ? conditions[0] : { $and: conditions }
}

/**
 * ChromaDB vector store provider.
 *
 * Implements the `AIVectorStoreProvider` interface using ChromaDB's
 * HTTP client. Each molecule collection maps to a ChromaDB collection
 * with HNSW indexing for similarity search.
 */
class ChromaProvider implements AIVectorStoreProvider {
  readonly name = 'chroma'
  private client: ChromaClient
  private collectionPrefix: string
  private defaultMetric: DistanceMetric

  /**
   * Creates a new ChromaDB provider.
   *
   * @param config - Provider configuration. API key defaults to CHROMA_API_KEY env var.
   */
  constructor(config: ChromaConfig = {}) {
    const apiKey = config.apiKey ?? process.env.CHROMA_API_KEY

    this.client = new ChromaClient({
      host: config.host ?? 'localhost',
      port: config.port ?? 8000,
      ssl: config.ssl ?? false,
      tenant: config.tenant,
      database: config.database,
      ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
    })

    this.collectionPrefix = config.collectionPrefix ?? 'mol_'
    this.defaultMetric = config.defaultMetric ?? 'cosine'
  }

  /**
   * Returns the ChromaDB collection name for a molecule collection.
   *
   * @param collection - Molecule collection name.
   * @returns Prefixed ChromaDB collection name.
   */
  private chromaName(collection: string): string {
    return `${this.collectionPrefix}${collection}`
  }

  /**
   * Strips the collection prefix to recover the molecule collection name.
   *
   * @param chromaCollectionName - ChromaDB collection name.
   * @returns Molecule collection name.
   */
  private moleculeName(chromaCollectionName: string): string {
    return chromaCollectionName.slice(this.collectionPrefix.length)
  }

  /**
   * Create a new collection backed by a ChromaDB collection with the
   * specified distance metric stored via HNSW configuration.
   *
   * @param params - Collection creation parameters.
   * @throws Error if the collection already exists.
   */
  async createCollection(params: CreateCollectionParams): Promise<void> {
    const metric = params.metric ?? this.defaultMetric

    await this.client.createCollection({
      name: this.chromaName(params.name),
      metadata: {
        [DIMENSION_KEY]: params.dimension,
        [METRIC_KEY]: metric,
        'hnsw:space': toChromaSpace(metric),
      },
    })
  }

  /**
   * Delete a collection by name.
   *
   * @param name - Name of the collection to delete.
   */
  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection({ name: this.chromaName(name) })
  }

  /**
   * List all collections that match the configured prefix.
   *
   * @returns Array of collection names (sorted).
   */
  async listCollections(): Promise<string[]> {
    const collections = await this.client.listCollections()
    return collections
      .filter((c) => c.name.startsWith(this.collectionPrefix))
      .map((c) => this.moleculeName(c.name))
      .sort()
  }

  /**
   * Upsert vector records into a collection.
   *
   * Content is stored as `_content` in metadata since ChromaDB documents
   * are intended for text-embedding scenarios. We store raw embeddings
   * and keep content in metadata for consistency with the vector store contract.
   *
   * @param params - Upsert parameters including collection and records.
   */
  async upsert(params: VectorUpsertParams): Promise<void> {
    if (params.records.length === 0) return

    const collection = await this.client.getCollection({
      name: this.chromaName(params.collection),
    })

    const ids: string[] = []
    const embeddings: number[][] = []
    const metadatas: Record<string, string | number | boolean>[] = []

    for (const record of params.records) {
      ids.push(record.id)
      embeddings.push(record.embedding)

      const meta: Record<string, string | number | boolean> = {}
      if (record.metadata) {
        for (const [key, value] of Object.entries(record.metadata)) {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            meta[key] = value
          }
        }
      }
      if (record.content !== undefined) {
        meta[CONTENT_KEY] = record.content
      }
      metadatas.push(meta)
    }

    await collection.upsert({ ids, embeddings, metadatas })
  }

  /**
   * Query for similar vectors using the collection's configured distance metric.
   *
   * @param params - Query parameters including embedding, topK, and optional filters.
   * @returns Results sorted by similarity (highest first).
   */
  async query(params: VectorQueryParams): Promise<VectorSearchResult[]> {
    const collection = await this.client.getCollection({
      name: this.chromaName(params.collection),
    })

    const topK = params.topK ?? 10

    const where = params.filter && params.filter.length > 0
      ? buildWhere(params.filter)
      : undefined

    const response = await collection.query({
      queryEmbeddings: [params.embedding],
      nResults: topK,
      include: [IncludeEnum.embeddings, IncludeEnum.metadatas, IncludeEnum.distances],
      where,
    })

    // ChromaDB returns nested arrays (one per query embedding)
    const ids = response.ids[0] ?? []
    const embeddingsResult = response.embeddings[0] ?? []
    const metadatasResult = response.metadatas[0] ?? []
    const distancesResult = response.distances[0] ?? []

    // Resolve the metric from collection metadata
    const collMeta = collection.metadata as Record<string, unknown> | undefined
    const storedMetric = collMeta?.[METRIC_KEY] as DistanceMetric | undefined
    const metric = storedMetric ?? this.defaultMetric

    const results: VectorSearchResult[] = []
    for (let i = 0; i < ids.length; i++) {
      const distance = distancesResult[i]
      if (distance === null || distance === undefined) continue

      const score = distanceToScore(distance, metric)
      if (params.minScore !== undefined && score < params.minScore) continue

      const rawMeta = (metadatasResult[i] ?? {}) as Record<string, unknown>
      const content = rawMeta[CONTENT_KEY] as string | undefined
      const metadata: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rawMeta)) {
        if (key !== CONTENT_KEY) {
          metadata[key] = value
        }
      }

      results.push({
        record: {
          id: ids[i],
          embedding: (embeddingsResult[i] as number[] | null) ?? [],
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

    const collection = await this.client.getCollection({
      name: this.chromaName(params.collection),
    })

    const response = await collection.get({
      ids: params.ids,
      include: [IncludeEnum.embeddings, IncludeEnum.metadatas],
    })

    const records: VectorRecord[] = []
    for (let i = 0; i < response.ids.length; i++) {
      const rawMeta = (response.metadatas[i] ?? {}) as Record<string, unknown>
      const content = rawMeta[CONTENT_KEY] as string | undefined
      const metadata: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rawMeta)) {
        if (key !== CONTENT_KEY) {
          metadata[key] = value
        }
      }

      records.push({
        id: response.ids[i],
        embedding: response.embeddings[i] ?? [],
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        content,
      })
    }

    return records
  }

  /**
   * Delete vector records by their IDs.
   *
   * @param params - Delete parameters including collection and IDs.
   */
  async delete(params: VectorDeleteParams): Promise<void> {
    if (params.ids.length === 0) return

    const collection = await this.client.getCollection({
      name: this.chromaName(params.collection),
    })

    await collection.delete({ ids: params.ids })
  }
}

/**
 * Creates a ChromaDB vector store provider instance.
 *
 * @param config - ChromaDB configuration.
 * @returns An `AIVectorStoreProvider` backed by ChromaDB.
 */
export function createProvider(config?: ChromaConfig): AIVectorStoreProvider {
  return new ChromaProvider(config)
}
