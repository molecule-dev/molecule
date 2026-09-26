/**
 * Configuration types for the language-model OCR provider.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'

/**
 * Options for {@link createProvider}. `ai` falls back to the bonded `ai`
 * provider; every other field has a prompt-level default.
 */
export interface LlmOcrConfig {
  /**
   * The AI provider to recognize with. Defaults to the provider bonded as
   * `ai` (`@molecule/api-ai` `requireProvider()`), which must support image
   * input (check the model catalog's `supportsVision`).
   */
  ai?: AIProvider
  /** The model id to pass to the provider. Omit to use the provider's default. */
  model?: string
  /** Default language hint when a `recognize` call passes none. */
  language?: string
  /**
   * Extra instructions, e.g. "This is a receipt; transcribe every line item".
   * Appended to the system prompt.
   */
  instructions?: string
  /** Sampling temperature. Defaults to 0 — transcription is not a creative task. */
  temperature?: number
  /** Output token ceiling. Defaults to a length derived from the image size. */
  maxOutputTokens?: number
}
