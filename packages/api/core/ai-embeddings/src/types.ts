/**
 * AIEmbeddings provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-embeddings implementation.
 *
 * @module
 */

/**
 * What the embeddings are for. Models trained with instruction prefixes (e.g.
 * EmbeddingGemma 2, `gemini-embedding-2`) embed differently per task; bonds
 * whose model has no such notion ignore it.
 */
export type EmbeddingTask =
  | 'search'
  | 'question-answering'
  | 'fact-checking'
  | 'code-retrieval'
  | 'classification'
  | 'clustering'
  | 'similarity'

/**
 * Which side of an asymmetric task an input is on: the short `query` a user
 * types, or the `document` stored in the index. Bonds that use instruction
 * prefixes map it; others ignore it.
 */
export type EmbeddingInputType = 'query' | 'document'

/** A kind of input a provider can embed. */
export type EmbeddingModality = 'text' | 'image' | 'audio' | 'video'

/**
 * A media input: raw bytes, a URL or file path, or bytes / a URL plus the
 * MIME type (`image/png`, `audio/wav`, `video/mp4`, …). Hosted APIs need the
 * MIME type, so prefer the object form when you have it.
 */
export type EmbedMediaSource = Uint8Array | string | { data: Uint8Array | string; mimeType: string }

/**
 * One input to {@link AIEmbeddingsProvider.embedContent}. Every field present in
 * ONE input is embedded together into ONE vector (e.g. a caption plus its image).
 */
export interface EmbedContentInput {
  /** Text, optionally with `<|image|>` / `<|audio|>` / `<|video|>` placeholders where the media sits. */
  text?: string
  /** An image. */
  image?: EmbedMediaSource
  /** An audio clip. */
  audio?: EmbedMediaSource
  /** A video clip. */
  video?: EmbedMediaSource
}

/**
 * Parameters for {@link AIEmbeddingsProvider.embedContent}.
 */
export interface EmbedContentParams {
  /** The inputs; the result holds one vector per input, in the same order. */
  inputs: EmbedContentInput[]
  /** Number of dimensions for the output vectors (if supported by the model). */
  dimensions?: number
  /** Model to use (provider-specific). */
  model?: string
  /** What the vectors are for (instruction-prefixed models only). */
  task?: EmbeddingTask
  /** Query or document side of the task (instruction-prefixed models only). */
  inputType?: EmbeddingInputType
}

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
  /** What the vectors are for (instruction-prefixed models only; others ignore it). */
  task?: EmbeddingTask
  /** Query or document side of the task (instruction-prefixed models only; others ignore it). */
  inputType?: EmbeddingInputType
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

  /**
   * The input kinds this provider can embed. Absent means text only. Check it
   * before calling {@link embedContent} with media instead of catching errors.
   */
  readonly modalities?: ReadonlyArray<EmbeddingModality>

  /**
   * Embed text and/or media into the same vector space as {@link embed}. Optional:
   * only multimodal providers implement it — check `modalities` first.
   *
   * @param params - The inputs (one vector each) plus dimensions/model/task.
   * @returns One vector per input, in order, with usage metadata.
   */
  embedContent?(params: EmbedContentParams): Promise<EmbeddingResult>
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
