/**
 * Permissions provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete permissions implementation.
 *
 * @module
 */

/**
 *
 */
export interface PermissionsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface PermissionsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
