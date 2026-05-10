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
