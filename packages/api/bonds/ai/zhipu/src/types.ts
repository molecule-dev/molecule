/**
 * Zhipu GLM AI provider configuration.
 *
 * @module
 */

/**
 * Configuration for Zhipu.
 */
export interface ZhipuConfig {
  /** API key. Defaults to ZHIPU_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'glm-5'. */
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
}
