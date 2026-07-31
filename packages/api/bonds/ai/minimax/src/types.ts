/**
 * MiniMax AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for MiniMax.
 */
export interface MiniMaxConfig {
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
  /** API key. Defaults to MINIMAX_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'minimax-m3'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.minimax.io' (MiniMax's INTERNATIONAL host; use 'https://api.minimaxi.com' for mainland China — keys are scoped per host). */
  baseUrl?: string
  /**
   * Chat-completions path appended to {@link baseUrl}. Defaults to
   * `/v1/chat/completions` (MiniMax-direct puts the version in the path). Set
   * this when the same open-weight model is served by a US OpenAI-compatible
   * host whose version prefix lives in the base URL instead — e.g. DeepInfra:
   * `baseUrl='https://api.deepinfra.com/v1/openai'` + `completionsPath='/chat/completions'`.
   */
  completionsPath?: string
  /**
   * Optional catalog-id → upstream-model-id map, applied to the outbound request
   * ONLY. Lets a US OpenAI-compatible host (DeepInfra) receive its namespaced id
   * (`MiniMaxAI/MiniMax-M3`) while the rest of the platform — pricing, cost
   * ceilings, display — keeps using the canonical catalog id (`minimax-m3`). An
   * id not in the map passes through unchanged.
   */
  modelMap?: Record<string, string>
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  MINIMAX_API_KEY: string
  /** Base URL override (for credential brokers / gateways / US OpenAI-compatible hosts). */
  MINIMAX_BASE_URL?: string
  /** Chat-completions path override (see {@link MiniMaxConfig.completionsPath}). */
  MINIMAX_COMPLETIONS_PATH?: string
}
