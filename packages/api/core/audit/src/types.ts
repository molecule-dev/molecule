/**
 * Audit provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete audit implementation.
 *
 * @module
 */

/**
 *
 */
export interface AuditProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface AuditConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
