/**
 * AIRag provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-rag implementation.
 *
 * @module
 */

/**
 *
 */
export interface AIRagProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AIRagConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
