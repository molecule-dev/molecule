/**
 * HTTP image generator provider configuration.
 *
 * @module
 */

/**
 * Configuration for the default HTTP image generator provider.
 */
export interface HttpImageGeneratorConfig {
  /** Base URL for API requests. Defaults to `''` (same origin). */
  baseUrl?: string
  /** Custom headers to include in requests. */
  headers?: Record<string, string>
}
