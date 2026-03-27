/**
 * Compliance provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete compliance implementation.
 *
 * @module
 */

/**
 *
 */
export interface ComplianceProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ComplianceConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
