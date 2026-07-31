/**
 * Anthropic Claude AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for anthropic.
 */
export interface AnthropicConfig {
  /** API key. Defaults to ANTHROPIC_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'claude-sonnet-5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). */
  baseUrl?: string
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  ANTHROPIC_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  ANTHROPIC_BASE_URL?: string
}
