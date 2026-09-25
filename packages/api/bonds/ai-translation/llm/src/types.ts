/**
 * Language-model translation provider configuration.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'

/**
 * Configuration for the language-model translation provider.
 */
export interface LlmTranslationConfig {
  /**
   * The `@molecule/api-ai` provider to translate with. Defaults to the provider
   * bonded as `ai` (`requireProvider()` from `@molecule/api-ai`) at first use —
   * pass one explicitly to translate with a different model than the app chats
   * with (e.g. a cheap model, or a self-hosted one via `@molecule/api-ai-local`).
   */
  ai?: AIProvider
  /** Model id passed to the AI provider. Defaults to the provider's own default model. */
  model?: string
  /** Texts per model request. Defaults to 40 — larger batches are cheaper but fail more often. */
  batchSize?: number
  /** Sampling temperature. Defaults to 0 (translation should be deterministic). */
  temperature?: number
  /**
   * Extra instructions appended to the system prompt — a style guide, a glossary
   * ("translate 'workspace' as 'Arbeitsbereich'"), or product context.
   */
  instructions?: string
}
