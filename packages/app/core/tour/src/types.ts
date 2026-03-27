/**
 * Tour provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete tour implementation.
 *
 * @module
 */

/**
 *
 */
export interface TourProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface TourConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
