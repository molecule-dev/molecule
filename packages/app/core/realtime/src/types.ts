/**
 * Realtime provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete realtime implementation.
 *
 * @module
 */

/**
 *
 */
export interface RealtimeProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface RealtimeConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
