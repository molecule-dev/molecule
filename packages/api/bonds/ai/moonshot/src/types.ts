/**
 * Moonshot (Kimi) AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for Moonshot.
 */
export interface MoonshotConfig {
  /** API key. Defaults to MOONSHOT_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'kimi-k2.5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.moonshot.cn'. */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  MOONSHOT_API_KEY: string
}
