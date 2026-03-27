/**
 * Audio provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete audio implementation.
 *
 * @module
 */

/**
 *
 */
export interface AudioProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AudioConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
