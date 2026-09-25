/**
 * Configuration types for the OpenAI content classifier.
 *
 * @module
 */

/**
 * Options for {@link createClassifier}. Every field falls back to an env var or
 * a default, so the zero-argument `classifier` export works from `.env` alone.
 */
export interface OpenaiModerationConfig {
  /** OpenAI API key. Defaults to `OPENAI_API_KEY`. */
  apiKey?: string
  /** API origin. Defaults to `OPENAI_BASE_URL`, then `https://api.openai.com`. */
  baseUrl?: string
  /** Moderation model. Default `omni-moderation-latest` (text + images). */
  model?: string
  /** Per-request timeout in milliseconds. Default 30000. */
  timeoutMs?: number
}

/** Environment variables this classifier reads. */
export interface ProcessEnv {
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
}
