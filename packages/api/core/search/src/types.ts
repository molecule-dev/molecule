/**
 * Search provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete search implementation.
 *
 * @module
 */

/**
 *
 */
export interface SearchProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface SearchConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
