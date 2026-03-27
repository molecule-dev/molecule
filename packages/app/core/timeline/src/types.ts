/**
 * Timeline provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete timeline implementation.
 *
 * @module
 */

/**
 *
 */
export interface TimelineProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface TimelineConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
