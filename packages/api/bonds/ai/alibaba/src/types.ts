/**
 * Alibaba Qwen AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for Alibaba Qwen.
 */
export interface AlibabaConfig {
  /** API key. Defaults to DASHSCOPE_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'qwen3-coder-plus'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://dashscope.aliyuncs.com/compatible-mode'. */
  baseUrl?: string
}

/**
 * Process Env interface.
 */
export interface ProcessEnv {
  DASHSCOPE_API_KEY: string
}
