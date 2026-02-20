/**
 * Type definitions for the webhook notifications provider.
 * @module
 */

/**
 * Configuration for the webhook notifications provider.
 */
export interface WebhookConfig {
  /** The webhook URL to POST to. Defaults to NOTIFICATIONS_WEBHOOK_URL env var. */
  url?: string
  /** Optional HMAC secret for request signing. Defaults to NOTIFICATIONS_WEBHOOK_SECRET env var. */
  secret?: string
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number
}

/**
 * Environment variables consumed by the webhook notifications provider.
 */
export interface ProcessEnv {
  NOTIFICATIONS_WEBHOOK_URL: string
  NOTIFICATIONS_WEBHOOK_SECRET?: string
}
