/**
 * MiniMax image generation provider configuration.
 *
 * @module
 */

import type { AIImageGenerationProvider } from '@molecule/api-ai-image-generation'

/**
 * The provider {@link createProvider} returns: an `AIImageGenerationProvider` whose `edit` is always
 * present, so code holding this bond (not a provider read back through `getProvider()`) calls it
 * without a check.
 */
export type MinimaxImageProvider = AIImageGenerationProvider &
  Required<Pick<AIImageGenerationProvider, 'edit'>>

/**
 * Configuration for the MiniMax image generation provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface MinimaxImageGenerationConfig {
  /** API key from the MiniMax platform. Defaults to the `MINIMAX_API_KEY` env var (required). */
  apiKey?: string
  /** Base URL override. Defaults to `MINIMAX_BASE_URL`, then `https://api.minimax.io`. */
  baseUrl?: string
  /** Default model id. Defaults to `MINIMAX_IMAGE_MODEL`, then `MiniMax-H3-Image`. */
  defaultModel?: string
  /** Per-request timeout in milliseconds. Defaults to 610000 (the server itself waits up to 600 s). */
  timeoutMs?: number
  /**
   * Send `disable_prompt_enhanced: true` on every request, turning OFF the
   * API's prompt rewriting. Off by default (the API enhances prompts — the
   * rewritten text comes back as each image's `revisedPrompt`). The core's
   * params have no such switch, so this is config-only.
   */
  disablePromptEnhanced?: boolean
}
