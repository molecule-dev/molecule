/**
 * HTTP/SSE chat provider configuration.
 *
 * @module
 */

/**
 * Configuration for http chat.
 */
export interface HttpChatConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
