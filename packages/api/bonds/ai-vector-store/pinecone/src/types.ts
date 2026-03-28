/**
 * Pinecone-specific configuration types.
 *
 * @module
 */

import type { DistanceMetric } from '@molecule/api-ai-vector-store'

/**
 * Configuration for the Pinecone vector store provider.
 */
export interface PineconeConfig {
  /** Pinecone API key. Falls back to `PINECONE_API_KEY` env var. */
  apiKey?: string
  /** Cloud provider for serverless indexes. Defaults to `'aws'`. */
  cloud?: 'aws' | 'gcp' | 'azure'
  /** Cloud region for serverless indexes. Defaults to `'us-east-1'`. */
  region?: string
  /** Prefix for Pinecone index names (collections map to indexes). Defaults to `'mol-'`. */
  indexPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Whether to wait for index readiness after creation. Defaults to `true`. */
  waitUntilReady?: boolean
}
