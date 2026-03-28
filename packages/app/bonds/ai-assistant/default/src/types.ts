/**
 * Default AI assistant provider configuration.
 *
 * @module
 */

/**
 * Configuration specific to the default HTTP/SSE assistant provider.
 */
export interface DefaultAssistantConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom HTTP headers to include in all requests. */
  headers?: Record<string, string>
}
