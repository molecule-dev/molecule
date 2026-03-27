/**
 * Markdown provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete markdown implementation.
 *
 * @module
 */

/**
 *
 */
export interface MarkdownProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface MarkdownConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
