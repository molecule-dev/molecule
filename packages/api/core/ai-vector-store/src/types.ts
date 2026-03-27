/**
 * AIVectorStore provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-vector-store implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIVectorStoreProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIVectorStoreConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
