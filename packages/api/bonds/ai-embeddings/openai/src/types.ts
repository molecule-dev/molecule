/**
 * OpenAI embeddings provider configuration.
 *
 * @module
 */

/**
 * Configuration for the OpenAI embeddings provider.
 */
export interface OpenaiEmbeddingsConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Default embedding model. Defaults to 'text-embedding-3-small'. */
  defaultModel?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Maximum number of texts per batch request. Defaults to 2048. */
  maxBatchSize?: number
  /** Default number of output dimensions (for text-embedding-3 models). */
  dimensions?: number
}
