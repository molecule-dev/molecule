/**
 * xAI Grok AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for xAI.
 */
export interface XaiConfig {
  /** API key. Defaults to XAI_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'grok-4.5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.x.ai'. */
  baseUrl?: string
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  XAI_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  XAI_BASE_URL?: string
}
