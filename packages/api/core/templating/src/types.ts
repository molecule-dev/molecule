/**
 * Templating provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete templating implementation.
 *
 * @module
 */

/**
 *
 */
export interface TemplatingProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface TemplatingConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
