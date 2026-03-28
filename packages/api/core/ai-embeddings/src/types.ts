/**
 * AIEmbeddings provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-embeddings implementation.
 *
 * @module
 */

/**
 * Parameters for generating embeddings.
 */
export interface EmbedParams {
  /** Text or array of texts to embed. */
  input: string | string[]
  /** Model to use for embedding (provider-specific). */
  model?: string
  /** Number of dimensions for the output vectors (if supported by model). */
  dimensions?: number
}

/**
 * Token usage information for an embedding request.
 */
export interface EmbeddingUsage {
  /** Number of prompt tokens consumed. */
  promptTokens: number
  /** Total tokens consumed. */
  totalTokens: number
}

/**
 * Result of an embedding request.
 */
export interface EmbeddingResult {
  /** The embedding vectors, one per input text. */
  embeddings: number[][]
  /** Model that produced the embeddings. */
  model: string
  /** Token usage information. */
  usage: EmbeddingUsage
}

/**
 * AIEmbeddings provider interface.
 *
 * Providers generate vector embeddings from text, enabling
 * semantic search, clustering, and similarity comparisons.
 */
export interface AIEmbeddingsProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Generate embeddings for one or more text inputs.
   *
   * @param params - Embedding parameters including input text(s), model, and dimensions.
   * @returns Embedding vectors with usage metadata.
   */
  embed(params: EmbedParams): Promise<EmbeddingResult>

  /**
   * Generate a single embedding vector for a query string.
   * Convenience method equivalent to `embed({ input: text })` returning the first vector.
   *
   * @param text - The query text to embed.
   * @returns A single embedding vector.
   */
  embedQuery(text: string): Promise<number[]>

  /**
   * Generate embedding vectors for multiple documents in batch.
   * Convenience method equivalent to `embed({ input: texts })` returning all vectors.
   *
   * @param texts - The document texts to embed.
   * @returns An array of embedding vectors, one per document.
   */
  embedDocuments(texts: string[]): Promise<number[][]>
}

/**
 * Base configuration for embeddings providers.
 */
export interface AIEmbeddingsConfig {
  /** API key for the embeddings service. */
  apiKey?: string
  /** Default model to use. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
