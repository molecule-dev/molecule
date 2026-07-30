/**
 * Moonshot (Kimi) AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

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
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  MOONSHOT_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  MOONSHOT_BASE_URL?: string
}
