/**
 * Sms provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete sms implementation.
 *
 * @module
 */

/**
 *
 */
export interface SmsProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface SmsConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
