/**
 * Configuration for the web clipboard provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface WebClipboardConfig {
  /**
   * When the async Clipboard API is unavailable (an insecure origin, an old
   * browser, a document without focus), copy text by selecting it in a hidden
   * element and running the `copy` command. Defaults to `true`.
   */
  legacyCopyFallback?: boolean
}
