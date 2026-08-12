/**
 * Alibaba Qwen AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback } from '@molecule/api-ai'

/**
 * Configuration for Alibaba Qwen.
 */
export interface AlibabaConfig {
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
  /** API key. Defaults to the `DASHSCOPE_API_KEY` (or `ALIBABA_API_KEY`) env var. */
  apiKey?: string
  /** Default model. Defaults to 'qwen3.8-max'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /**
   * Base URL override (for proxies). Defaults to the `DASHSCOPE_BASE_URL` env
   * var, then 'https://dashscope-us.aliyuncs.com/compatible-mode'.
   */
  baseUrl?: string
  /**
   * Chat-completions path appended to {@link baseUrl}. Defaults to
   * `/v1/chat/completions`. Unchanged for DashScope-US; also correct for
   * DeepInfra when baseUrl='https://api.deepinfra.com/v1/openai' would need
   * `/chat/completions` — set it accordingly for that host.
   */
  completionsPath?: string
  /**
   * Catalog-id → upstream-model-id map, applied to the outbound request only, so
   * a US host (DeepInfra) receives its namespaced id
   * (`Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo`) while pricing/cost/display keep
   * the canonical catalog id (`qwen3-coder-plus`).
   */
  modelMap?: Record<string, string>
}

/**
 * Process env vars read by the Alibaba DashScope AI bond.
 */
export interface ProcessEnv {
  /** Alibaba DashScope API key. */
  DASHSCOPE_API_KEY: string
  /** Alternate key env var (same value; checked after DASHSCOPE_API_KEY). */
  ALIBABA_API_KEY?: string
  /** Base URL override (for credential brokers / gateways / US OpenAI-compatible hosts). */
  DASHSCOPE_BASE_URL?: string
  /** Chat-completions path override (see {@link AlibabaConfig.completionsPath}). */
  DASHSCOPE_COMPLETIONS_PATH?: string
}
