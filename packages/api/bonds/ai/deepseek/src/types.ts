/**
 * DeepSeek AI provider configuration.
 *
 * @module
 */

import type { AiRateLimitCallback, AiStreamStallCallback } from '@molecule/api-ai'

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
  /**
   * Optional catalog-id → upstream-model-id map, applied to the outbound request
   * ONLY. Lets a US OpenAI-compatible host (DeepInfra) receive its namespaced id
   * (`deepseek-ai/DeepSeek-V4-Flash`) while the rest of the platform — pricing,
   * cost ceilings, display — keeps using the canonical catalog id
   * (`deepseek-v4-flash`). An id not in the map passes through unchanged.
   */
  modelMap?: Record<string, string>
  /** Called on each rate-limited/overloaded upstream response, before any retry sleep. */
  onRateLimit?: AiRateLimitCallback
  /** Called when a stream accepts the request and then produces no content for the whole first-token window. */
  onStreamStall?: AiStreamStallCallback
  /**
   * How long a stream may wait for its FIRST content event before the provider
   * abandons it and asks again (ms). Defaults to 45 000.
   *
   * Counted from the moment the request is sent, and cleared by the first
   * `text` / `thinking` / `tool_use` event — NOT by a liveness frame, because
   * DeepSeek keeps a stalled prefill's connection alive with `: keep-alive`
   * comments, so a byte-level idle timeout never sees the stall at all. A turn's
   * healthy first-token wait is ~1 s even on million-token prompts, so this
   * window is a stall bound, not a latency budget.
   */
  firstTokenTimeoutMs?: number
  /**
   * How long a stream that has ALREADY started may go without a single byte
   * before the provider abandons it (ms). Defaults to 60 000.
   *
   * Measured over the socket, not over content: once the reply has started, any
   * byte proves the connection is alive, and a stretch with none is a broken
   * stream rather than a slow one. Abandoning it here is not retried — the
   * partial reply is already on the wire — it is reported as an error event for
   * the caller's own ladder, which keeps the partial.
   */
  streamSilenceTimeoutMs?: number
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
