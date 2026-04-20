/**
 * PostgreSQL pgvector implementation of AIVectorStoreProvider.
 *
 * Uses the `pg` client library with the `pgvector` extension to store
 * and query embedding vectors in PostgreSQL. Each collection maps to a
 * dedicated table with a vector column indexed for similarity search.
 *
 * @module
 */

import pg from 'pg'
import { fromSql } from 'pgvector'
import { registerTypes, toSql } from 'pgvector/pg'

import type {
  AIVectorStoreProvider,
  CreateCollectionParams,
  DistanceMetric,
  VectorDeleteParams,
  VectorFetchParams,
  VectorQueryParams,
  VectorRecord,
  VectorSearchResult,
  VectorUpsertParams,
} from '@molecule/api-ai-vector-store'

import type { PgvectorConfig } from './types.js'

/** Metadata row shape returned by the collections registry table. */
interface CollectionRow {
  name: string
  dimension: number
  metric: string
}

/** Row shape returned by vector queries. */
interface VectorRow {
  id: string
  embedding: string
  metadata: Record<string, unknown> | null
  content: string | null
  distance?: number
}

/**
 * Returns the SQL operator for a given distance metric.
 *
 * @param metric - The distance metric.
 * @returns The pgvector distance operator.
 */
function distanceOperator(metric: DistanceMetric): string {
  switch (metric) {
    case 'cosine':
      return '<=>'
    case 'euclidean':
      return '<->'
    case 'inner_product':
      return '<#>'
  }
}

/**
 * Returns the pgvector index access method for a given distance metric.
 *
 * @param metric - The distance metric.
 * @returns The index operator class for ivfflat or hnsw indexes.
 */
function indexOpClass(metric: DistanceMetric): string {
  switch (metric) {
    case 'cosine':
      return 'vector_cosine_ops'
    case 'euclidean':
      return 'vector_l2_ops'
    case 'inner_product':
      return 'vector_ip_ops'
  }
}

/**
 * Converts a distance value to a similarity score (0–1, higher is more similar).
 *
 * @param distance - The raw distance from pgvector.
 * @param metric - The distance metric used.
 * @returns Normalized similarity score.
 */
function distanceToScore(distance: number, metric: DistanceMetric): number {
  switch (metric) {
    case 'cosine':
      // pgvector cosine distance is 1 - cosine_similarity, so score = 1 - distance
      return 1 - distance
    case 'euclidean':
      // Convert euclidean distance to similarity: 1 / (1 + distance)
      return 1 / (1 + distance)
    case 'inner_product':
      // pgvector inner product distance is negative inner product
      // Higher inner product = more similar, distance = -ip
      return -distance
  }
}

/**
 * PostgreSQL pgvector vector store provider.
 *
 * Implements the `AIVectorStoreProvider` interface using PostgreSQL with
 * the pgvector extension. Each collection is a separate table with HNSW
 * indexing for fast approximate nearest neighbor search.
 */
class PgvectorProvider implements AIVectorStoreProvider {
  readonly name = 'pgvector'
  private pool: pg.Pool
  private schema: string
  private tablePrefix: string
  private defaultMetric: DistanceMetric
  private initialized = false

  /**
   * Creates a new pgvector provider.
   *
   * @param config - Provider configuration. Connection string defaults to DATABASE_URL env var.
   */
  constructor(config: PgvectorConfig = {}) {
    const connectionString = config.connectionString ?? process.env.DATABASE_URL ?? ''
    this.schema = config.schema ?? 'public'
    this.tablePrefix = config.tablePrefix ?? 'mol_vectors_'
    this.defaultMetric = config.defaultMetric ?? 'cosine'

    this.pool = new pg.Pool({
      connectionString,
      max: config.poolSize ?? 5,
    })
  }

  /**
   * Ensures the pgvector extension and collections registry table exist.
   * Called lazily before the first database operation.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const client = await this.pool.connect()
    try {
      await registerTypes(client)
      await client.query('CREATE EXTENSION IF NOT EXISTS vector')
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.registryTable} (
          name TEXT PRIMARY KEY,
          dimension INTEGER NOT NULL,
          metric TEXT NOT NULL DEFAULT 'cosine',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      this.initialized = true
    } finally {
      client.release()
    }
  }

  /**
   * Fully-qualified name of the collections registry table.
   *
   * @returns The quoted schema.table identifier for the registry.
   */
  private get registryTable(): string {
    return `"${this.schema}"."${this.tablePrefix}collections"`
  }

  /**
   * Returns the fully-qualified table name for a collection.
   *
   * @param collection - Collection name.
   * @returns Qualified table name.
   */
  private collectionTable(collection: string): string {
    return `"${this.schema}"."${this.tablePrefix}${collection}"`
  }

  /**
   * Looks up collection metadata from the registry.
   *
   * @param name - Collection name.
   * @returns Collection metadata or null if not found.
   */
  private async getCollectionMeta(name: string): Promise<CollectionRow | null> {
    const result = await this.pool.query<CollectionRow>(
      `SELECT name, dimension, metric FROM ${this.registryTable} WHERE name = $1`,
      [name],
    )
    return result.rows[0] ?? null
  }

  /**
   * Create a new collection backed by a PostgreSQL table with a vector column
   * and HNSW index for fast similarity search.
   *
   * @param params - Collection creation parameters.
   * @throws {Error} if the collection already exists.
   */
  async createCollection(params: CreateCollectionParams): Promise<void> {
    await this.ensureInitialized()
    const metric = params.metric ?? this.defaultMetric
    const table = this.collectionTable(params.name)

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Register in the collections table
      await client.query(
        `INSERT INTO ${this.registryTable} (name, dimension, metric) VALUES ($1, $2, $3)`,
        [params.name, params.dimension, metric],
      )

      // Create the vector table
      await client.query(`
        CREATE TABLE ${table} (
          id TEXT PRIMARY KEY,
          embedding vector(${params.dimension}) NOT NULL,
          metadata JSONB,
          content TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)

      // Create HNSW index for similarity search
      await client.query(`
        CREATE INDEX ON ${table}
        USING hnsw (embedding ${indexOpClass(metric)})
      `)

      // Create GIN index on metadata for filtered queries
      await client.query(`
        CREATE INDEX ON ${table}
        USING gin (metadata jsonb_path_ops)
      `)

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Delete a collection, dropping its table and removing the registry entry.
   *
   * @param name - Name of the collection to delete.
   */
  async deleteCollection(name: string): Promise<void> {
    await this.ensureInitialized()
    const table = this.collectionTable(name)

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`DROP TABLE IF EXISTS ${table}`)
      await client.query(`DELETE FROM ${this.registryTable} WHERE name = $1`, [name])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * List all registered collections.
   *
   * @returns Array of collection names.
   */
  async listCollections(): Promise<string[]> {
    await this.ensureInitialized()
    const result = await this.pool.query<{ name: string }>(
      `SELECT name FROM ${this.registryTable} ORDER BY name`,
    )
    return result.rows.map((row) => row.name)
  }

  /**
   * Upsert vector records into a collection. Existing records (by ID) are updated;
   * new records are inserted.
   *
   * @param params - Upsert parameters including collection and records.
   * @throws {Error} if the collection does not exist.
   */
  async upsert(params: VectorUpsertParams): Promise<void> {
    if (params.records.length === 0) return
    await this.ensureInitialized()

    const table = this.collectionTable(params.collection)
    const client = await this.pool.connect()
    try {
      await registerTypes(client)
      await client.query('BEGIN')

      for (const record of params.records) {
        await client.query(
          `INSERT INTO ${table} (id, embedding, metadata, content, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (id) DO UPDATE SET
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             content = EXCLUDED.content,
             updated_at = now()`,
          [
            record.id,
            toSql(record.embedding),
            record.metadata ? JSON.stringify(record.metadata) : null,
            record.content ?? null,
          ],
        )
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Query for similar vectors using cosine/euclidean/inner-product distance.
   *
   * @param params - Query parameters including embedding, topK, and optional filters.
   * @returns Results sorted by similarity (highest first).
   * @throws {Error} if the collection does not exist.
   */
  async query(params: VectorQueryParams): Promise<VectorSearchResult[]> {
    await this.ensureInitialized()
    const meta = await this.getCollectionMeta(params.collection)
    if (!meta) {
      throw new Error(`Collection "${params.collection}" does not exist`)
    }

    const metric = meta.metric as DistanceMetric
    const operator = distanceOperator(metric)
    const table = this.collectionTable(params.collection)
    const topK = params.topK ?? 10

    // Build WHERE clause from filters
    const conditions: string[] = []
    const values: unknown[] = [toSql(params.embedding)]
    let paramIdx = 2

    if (params.filter) {
      for (const f of params.filter) {
        const fieldPath = `metadata->>'${f.field}'`
        switch (f.operator) {
          case 'eq':
            conditions.push(`${fieldPath} = $${paramIdx}`)
            values.push(String(f.value))
            paramIdx++
            break
          case 'ne':
            conditions.push(`${fieldPath} != $${paramIdx}`)
            values.push(String(f.value))
            paramIdx++
            break
          case 'gt':
            conditions.push(`(${fieldPath})::numeric > $${paramIdx}`)
            values.push(f.value)
            paramIdx++
            break
          case 'gte':
            conditions.push(`(${fieldPath})::numeric >= $${paramIdx}`)
            values.push(f.value)
            paramIdx++
            break
          case 'lt':
            conditions.push(`(${fieldPath})::numeric < $${paramIdx}`)
            values.push(f.value)
            paramIdx++
            break
          case 'lte':
            conditions.push(`(${fieldPath})::numeric <= $${paramIdx}`)
            values.push(f.value)
            paramIdx++
            break
          case 'in': {
            const placeholders = f.value.map((_, i) => `$${paramIdx + i}`).join(', ')
            conditions.push(`${fieldPath} IN (${placeholders})`)
            for (const v of f.value) {
              values.push(String(v))
              paramIdx++
            }
            break
          }
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await this.pool.query<VectorRow>(
      `SELECT id, embedding::text, metadata, content,
              embedding ${operator} $1 AS distance
       FROM ${table}
       ${whereClause}
       ORDER BY embedding ${operator} $1
       LIMIT ${topK}`,
      values,
    )

    const results: VectorSearchResult[] = []
    for (const row of result.rows) {
      const score = distanceToScore(row.distance!, metric)
      if (params.minScore !== undefined && score < params.minScore) continue

      results.push({
        record: {
          id: row.id,
          embedding: fromSql(row.embedding),
          metadata: row.metadata ?? undefined,
          content: row.content ?? undefined,
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
    await this.ensureInitialized()
    if (params.ids.length === 0) return []

    const table = this.collectionTable(params.collection)
    const placeholders = params.ids.map((_, i) => `$${i + 1}`).join(', ')

    const result = await this.pool.query<VectorRow>(
      `SELECT id, embedding::text, metadata, content
       FROM ${table}
       WHERE id IN (${placeholders})`,
      params.ids,
    )

    return result.rows.map((row) => ({
      id: row.id,
      embedding: fromSql(row.embedding),
      metadata: row.metadata ?? undefined,
      content: row.content ?? undefined,
    }))
  }

  /**
   * Delete vector records by their IDs.
   *
   * @param params - Delete parameters including collection and IDs.
   */
  async delete(params: VectorDeleteParams): Promise<void> {
    await this.ensureInitialized()
    if (params.ids.length === 0) return

    const table = this.collectionTable(params.collection)
    const placeholders = params.ids.map((_, i) => `$${i + 1}`).join(', ')

    await this.pool.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, params.ids)
  }

  /**
   * Gracefully shut down the connection pool.
   */
  async destroy(): Promise<void> {
    await this.pool.end()
  }
}

/**
 * Creates a pgvector vector store provider instance.
 *
 * @param config - PostgreSQL + pgvector configuration.
 * @returns An `AIVectorStoreProvider` backed by PostgreSQL with pgvector.
 */
export function createProvider(config?: PgvectorConfig): PgvectorProvider {
  return new PgvectorProvider(config)
}
