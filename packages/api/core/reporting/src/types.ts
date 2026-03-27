/**
 * Reporting provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete reporting implementation.
 *
 * @module
 */

/**
 *
 */
export interface ReportingProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ReportingConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
