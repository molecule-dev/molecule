/**
 * Gemini API embeddings provider configuration.
 *
 * @module
 */

import type { EmbeddingTask } from '@molecule/api-ai-embeddings'

/**
 * Configuration for the Gemini API embeddings provider.
 */
export interface GeminiEmbeddingsConfig {
  /** API key. Defaults to the `GOOGLE_AI_API_KEY` env var, then `GEMINI_API_KEY`. */
  apiKey?: string
  /** Default model. Defaults to `gemini-embedding-2`. */
  defaultModel?: string
  /**
   * API base URL including the version. Defaults to `GOOGLE_AI_BASE_URL` or
   * `https://generativelanguage.googleapis.com/v1beta`.
   */
  baseUrl?: string
  /** Default output size, 128–3072 (`output_dimensionality`). Omitted = the model default (3072). */
  dimensions?: number
  /** Default task for prefixes. Defaults to `search`. */
  task?: EmbeddingTask
  /**
   * Prepend the task prefixes Google recommends (`task: search result | query: …`,
   * `title: none | text: …`). Defaults to `true`; text that already starts with
   * `task: ` or `title: ` is never prefixed twice.
   */
  applyPrefixes?: boolean
  /** Inputs per `batchEmbedContents` request. Defaults to 100; larger lists are split. */
  maxBatchSize?: number
}
