/**
 * Cron provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete cron implementation.
 *
 * @module
 */

/**
 *
 */
export interface CronProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface CronConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
