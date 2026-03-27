/**
 * Image provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete image implementation.
 *
 * @module
 */

/**
 *
 */
export interface ImageProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ImageConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
