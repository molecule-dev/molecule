/**
 * Configuration types for the language-model speech provider.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'

/**
 * Options for {@link createProvider}. `ai` falls back to the bonded `ai`
 * provider; every other field has a prompt-level default.
 */
export interface LlmSpeechConfig {
  /**
   * The AI provider to transcribe with. Defaults to the provider bonded as
   * `ai` (`@molecule/api-ai` `requireProvider()`), whose model must accept
   * audio input.
   */
  ai?: AIProvider
  /** The model id to pass to the provider. Omit to use the provider's default. */
  model?: string
  /** Default language hint when a `transcribe` call passes none. */
  language?: string
  /** Extra instructions, e.g. "Medical dictation; keep drug names verbatim". Appended to the system prompt. */
  instructions?: string
  /** Output token ceiling. Defaults to a length derived from the audio size. */
  maxOutputTokens?: number
}
