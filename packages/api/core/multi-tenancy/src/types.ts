/**
 * MultiTenancy provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete multi-tenancy implementation.
 *
 * @module
 */

/**
 *
 */
export interface MultiTenancyProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface MultiTenancyConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
