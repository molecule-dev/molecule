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
  /** Default model. Defaults to 'kimi-k3'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.moonshot.cn'. */
  baseUrl?: string
  /**
   * Chat-completions path appended to {@link baseUrl}. Defaults to
   * `/v1/chat/completions` (Moonshot-direct puts the version in the path). Set
   * this when the same open-weight model is served by a US OpenAI-compatible
   * host whose version prefix lives in the base URL instead — e.g. DeepInfra:
   * `baseUrl='https://api.deepinfra.com/v1/openai'` + `completionsPath='/chat/completions'`.
   */
  completionsPath?: string
  /**
   * Optional catalog-id → upstream-model-id map, applied to the outbound request
   * ONLY. Lets a US OpenAI-compatible host (DeepInfra) receive its namespaced id
   * (`moonshotai/Kimi-K3`) while the rest of the platform — pricing, cost
   * ceilings, display — keeps using the canonical catalog id (`kimi-k3`). An id
   * not in the map passes through unchanged.
   */
  modelMap?: Record<string, string>
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  MOONSHOT_API_KEY: string
  /** Base URL override (for credential brokers / gateways / US OpenAI-compatible hosts). */
  MOONSHOT_BASE_URL?: string
  /** Chat-completions path override (see {@link MoonshotConfig.completionsPath}). */
  MOONSHOT_COMPLETIONS_PATH?: string
}
