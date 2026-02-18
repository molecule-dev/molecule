/**
 * Anthropic Claude AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for anthropic.
 */
export interface AnthropicConfig {
  /** API key. Defaults to ANTHROPIC_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'claude-opus-4-6'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  ANTHROPIC_API_KEY: string
}
