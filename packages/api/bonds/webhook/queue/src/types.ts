/**
 * Queue-backed webhook provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the queue-backed webhook provider.
 */
export interface QueueWebhookConfig {
  /** HTTP request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number

  /** Maximum number of retry attempts per delivery. Defaults to 5. */
  maxRetries?: number

  /** Base delay for exponential backoff in milliseconds. Defaults to 1000. */
  baseDelay?: number

  /** Maximum delay cap for exponential backoff in milliseconds. Defaults to 60000. */
  maxDelay?: number

  /** Maximum number of concurrent deliveries. Defaults to 10. */
  concurrency?: number

  /** HTTP header name used to send the HMAC payload signature. Defaults to `'x-webhook-signature'`. */
  signatureHeader?: string
}

/**
 * Internal state of a queued delivery job.
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
