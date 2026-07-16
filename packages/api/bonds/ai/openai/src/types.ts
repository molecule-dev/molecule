/**
 * Openai AI provider configuration.
 *
 * @module
 */

/** OpenAI provider configuration. */
export interface OpenaiConfig {
  /** Override the API key (defaults to `process.env.OPENAI_API_KEY`). */
  apiKey?: string
  /** Default model when callers don't specify one. */
  defaultModel?: string
  /** Default max output tokens. */
  maxTokens?: number
  /** Override the API base URL (for proxies / Azure). */
  baseUrl?: string
}

/** Environment variables read by this provider. */
export interface ProcessEnv {
  /** OpenAI API key (required unless `config.apiKey` is passed). */
  OPENAI_API_KEY: string
  /** Base URL override (for proxies / Azure-compatible gateways). Defaults to `https://api.openai.com`. */
  OPENAI_BASE_URL?: string
}
