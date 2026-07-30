/**
 * DeepSeek AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for DeepSeek.
 */
export interface DeepseekConfig {
  /** API key. Defaults to DEEPSEEK_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'deepseek-v4-flash'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.deepseek.com'. */
  baseUrl?: string
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  DEEPSEEK_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  DEEPSEEK_BASE_URL?: string
}
