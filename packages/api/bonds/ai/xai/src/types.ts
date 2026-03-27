/**
 * xAI Grok AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for xAI.
 */
export interface XaiConfig {
  /** API key. Defaults to XAI_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'grok-code-fast-1'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.x.ai'. */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  XAI_API_KEY: string
}
