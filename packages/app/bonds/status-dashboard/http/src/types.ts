/**
 * HTTP status dashboard provider configuration.
 *
 * @module
 */

/**
 * Configuration for http status dashboard provider.
 */
export interface HttpStatusDashboardConfig {
  /** Base URL for API requests. Defaults to '' (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
