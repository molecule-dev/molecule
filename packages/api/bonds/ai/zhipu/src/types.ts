/**
 * Zhipu GLM AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for Zhipu.
 */
export interface ZhipuConfig {
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
  /** API key. Defaults to ZHIPU_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'glm-5.2'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://open.bigmodel.cn/api/paas'. */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  ZHIPU_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  ZHIPU_BASE_URL?: string
}
