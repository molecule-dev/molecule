/**
 * Configuration types for the TeleOCR provider.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'

/**
 * Options for {@link createProvider}. `ai` falls back to the bonded `ai`
 * provider; `model` falls back to `TELEOCR_MODEL`, then {@link DEFAULT_TELEOCR_MODEL}.
 */
export interface TeleOcrConfig {
  /**
   * The AI provider that reaches the TeleOCR server. Defaults to the provider
   * bonded as `ai` (`@molecule/api-ai` `requireProvider()`) — typically
   * `@molecule/api-ai-local` pointed at the vLLM server
   * (`LOCAL_AI_BASE_URL=http://localhost:8000/v1`).
   */
  ai?: AIProvider
  /**
   * The served model name (what `vllm serve` was started with). Defaults to
   * the `TELEOCR_MODEL` env var, read on each call, then `'StarDoc-AI/TeleOCR'`.
   */
  model?: string
  /**
   * Output token ceiling per call. Defaults to 4096, the reference
   * implementation's `max_new_tokens`. A page that hits it throws
   * {@link TeleOcrTruncatedError} instead of returning cut-off text.
   */
  maxOutputTokens?: number
}

/**
 * Environment variables the provider reads (each on every call, never at import).
 */
export interface TeleOcrEnv {
  /** The served model name; overrides {@link DEFAULT_TELEOCR_MODEL}. */
  TELEOCR_MODEL?: string
}
