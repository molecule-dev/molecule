/**
 * HTTP webhook provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the HTTP webhook provider.
 */
export interface HttpWebhookConfig {
  /** HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number

  /** Default number of automatic retries on delivery failure. Defaults to 3. */
  retryCount?: number

  /** Delay between retry attempts in milliseconds. Defaults to 1000. */
  retryDelay?: number

  /** HTTP header name used to send the HMAC payload signature. Defaults to `'x-webhook-signature'`. */
  signatureHeader?: string
}
