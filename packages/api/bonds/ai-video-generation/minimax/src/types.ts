/**
 * MiniMax video generation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the MiniMax video generation provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface MinimaxVideoGenerationConfig {
  /** API key from the MiniMax platform. Defaults to the `MINIMAX_API_KEY` env var (required). */
  apiKey?: string
  /** Base URL override. Defaults to `MINIMAX_BASE_URL`, then `https://api.minimax.io`. */
  baseUrl?: string
  /** Default model id. Defaults to `MINIMAX_VIDEO_MODEL`, then `MiniMax-H3`. */
  defaultModel?: string
  /** Per-request timeout in milliseconds. Defaults to 120000. */
  timeoutMs?: number
  /**
   * `extra.prompt_expansion_mode` — `MiniMax-H3-Max` only (the API default is
   * `balanced`). Setting it on any other model throws. The core's params have
   * no such switch, so this is config-only.
   */
  promptExpansionMode?: 'disabled' | 'balanced' | 'quality'
}
