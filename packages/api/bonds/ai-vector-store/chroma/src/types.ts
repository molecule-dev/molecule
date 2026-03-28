/**
 * ChromaDB-specific configuration types.
 *
 * @module
 */

import type { DistanceMetric } from '@molecule/api-ai-vector-store'

/**
 * Configuration for the ChromaDB vector store provider.
 */
export interface ChromaConfig {
  /** ChromaDB server host. Defaults to `'localhost'`. */
  host?: string
  /** ChromaDB server port. Defaults to `8000`. */
  port?: number
  /** Whether to use SSL/HTTPS. Defaults to `false`. */
  ssl?: boolean
  /** API key or auth token for ChromaDB Cloud. Falls back to `CHROMA_API_KEY` env var. */
  apiKey?: string
  /** Tenant name. Defaults to `'default_tenant'`. */
  tenant?: string
  /** Database name. Defaults to `'default_database'`. */
  database?: string
  /** Prefix for collection names to avoid conflicts. Defaults to `'mol_'`. */
  collectionPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
}
