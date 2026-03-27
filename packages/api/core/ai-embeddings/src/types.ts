/**
 * AIEmbeddings provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-embeddings implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIEmbeddingsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIEmbeddingsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
