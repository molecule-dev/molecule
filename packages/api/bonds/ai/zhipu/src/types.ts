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
  /**
   * Chat-completions path appended to {@link baseUrl}. Defaults to
   * `/v4/chat/completions` (Zhipu-native). Set to `/chat/completions` when the
   * GLM open weights are served from a US OpenAI-compatible host (DeepInfra:
   * baseUrl='https://api.deepinfra.com/v1/openai').
   */
  completionsPath?: string
  /**
   * Catalog-id → upstream-model-id map, applied to the outbound request only, so
   * a US host (DeepInfra) receives its namespaced id (`zai-org/GLM-5.2`) while
   * pricing/cost/display keep the canonical catalog id (`glm-5.2`).
   */
  modelMap?: Record<string, string>
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  ZHIPU_API_KEY: string
  /** Base URL override (for credential brokers / gateways / US OpenAI-compatible hosts). */
  ZHIPU_BASE_URL?: string
  /** Chat-completions path override (see {@link ZhipuConfig.completionsPath}). */
  ZHIPU_COMPLETIONS_PATH?: string
}
