/**
 * AIRag provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-rag implementation.
 *
 * @module
 */

/**
 * Live AI RAG integration contract (TODO: expand methods).
 */
export interface AIRagProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 * Config options for an AI RAG bond (TODO: tighten schema).
 */
export interface AIRagConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
