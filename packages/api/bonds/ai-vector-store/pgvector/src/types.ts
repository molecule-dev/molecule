/**
 * Pgvector-specific configuration types.
 *
 * @module
 */

import type { DistanceMetric } from '@molecule/api-ai-vector-store'

/**
 * Configuration for the pgvector vector store provider.
 */
export interface PgvectorConfig {
  /** PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`). Falls back to `DATABASE_URL` env var. */
  connectionString?: string
  /** Schema to use for vector store tables. Defaults to `'public'`. */
  schema?: string
  /** Table name prefix for vector store tables. Defaults to `'mol_vectors_'`. */
  tablePrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Connection pool size. Defaults to 5. */
  poolSize?: number
}
