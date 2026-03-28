/**
 * Default AI copilot provider configuration.
 *
 * @module
 */

/**
 * Configuration for the default HTTP-based copilot provider.
 */
export interface DefaultCopilotConfig {
  /** Base URL for API requests. Defaults to `''` (same origin). */
  baseUrl?: string
  /** Custom headers to include in every request. */
  headers?: Record<string, string>
}
