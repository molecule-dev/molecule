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
  /**
   * Chat-completions path appended to {@link baseUrl}. Defaults to
   * `/v1/chat/completions` (DeepSeek-direct puts the version in the path). Set
   * this when the same open-weight model is served by a US OpenAI-compatible
   * host whose version prefix lives in the base URL instead — e.g. DeepInfra:
   * `baseUrl='https://api.deepinfra.com/v1/openai'` + `completionsPath='/chat/completions'`.
   */
  completionsPath?: string
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  DEEPSEEK_API_KEY: string
  /** Base URL override (for credential brokers / gateways / US OpenAI-compatible hosts). */
  DEEPSEEK_BASE_URL?: string
  /** Chat-completions path override (see {@link DeepseekConfig.completionsPath}). */
  DEEPSEEK_COMPLETIONS_PATH?: string
}
