/**
 * Type definitions for the Slack notifications provider.
 * @module
 */

/**
 * Configuration for the Slack notifications provider.
 */
export interface SlackConfig {
  /** Slack incoming webhook URL. Defaults to NOTIFICATIONS_SLACK_WEBHOOK_URL env var. */
  webhookUrl?: string
  /** Request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number
}

/**
 * Environment variables consumed by the Slack notifications provider.
 */
export interface ProcessEnv {
  NOTIFICATIONS_SLACK_WEBHOOK_URL: string
}
