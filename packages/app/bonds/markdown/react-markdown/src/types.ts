/**
 * Configuration for the react-markdown provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface ReactMarkdownConfig {
  /** Whether to sanitize HTML by default. Defaults to `true`. */
  sanitize?: boolean

  /** Whether to enable GFM by default. Defaults to `true`. */
  gfm?: boolean
}
