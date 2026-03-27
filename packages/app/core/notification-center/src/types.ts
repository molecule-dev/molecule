/**
 * NotificationCenter provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete notification-center implementation.
 *
 * @module
 */

/**
 *
 */
export interface NotificationCenterProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface NotificationCenterConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
