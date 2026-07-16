/**
 * Alibaba Qwen AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for Alibaba Qwen.
 */
export interface AlibabaConfig {
  /** API key. Defaults to the `DASHSCOPE_API_KEY` (or `ALIBABA_API_KEY`) env var. */
  apiKey?: string
  /** Default model. Defaults to 'qwen3.6-plus'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /**
   * Base URL override (for proxies). Defaults to the `DASHSCOPE_BASE_URL` env
   * var, then 'https://dashscope-us.aliyuncs.com/compatible-mode'.
   */
  baseUrl?: string
}

/**
 * Process env vars read by the Alibaba DashScope AI bond.
 */
export interface ProcessEnv {
  /** Alibaba DashScope API key. */
  DASHSCOPE_API_KEY: string
  /** Alternate key env var (same value; checked after DASHSCOPE_API_KEY). */
  ALIBABA_API_KEY?: string
  /** Base URL override (for credential brokers / gateways). */
  DASHSCOPE_BASE_URL?: string
}
