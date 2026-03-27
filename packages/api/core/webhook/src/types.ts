/**
 * Webhook provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete webhook implementation.
 *
 * @module
 */

/**
 *
 */
export interface WebhookProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface WebhookConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
