/**
 * MiniMax AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for MiniMax.
 */
export interface MiniMaxConfig {
  /** API key. Defaults to MINIMAX_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'minimax-m2.5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.minimax.chat'. */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  MINIMAX_API_KEY: string
}
