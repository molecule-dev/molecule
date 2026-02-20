/**
 * Type definitions for the notifications core interface.
 * @module
 */

/**
 * A notification to send through a notification channel.
 */
export interface Notification {
  /** Subject or title of the notification. */
  subject: string
  /** Body text of the notification (may contain markdown). */
  body: string
  /** Optional metadata for provider-specific features. */
  metadata?: Record<string, unknown>
}

/**
 * Result of a notification send attempt.
 */
export interface NotificationResult {
  /** Whether the notification was sent successfully. */
  success: boolean
  /** Error message if the send failed. */
  error?: string
  /** Channel name this result came from (populated by notifyAll). */
  channel?: string
  /** ISO 8601 timestamp of the send attempt (populated by notifyAll). */
  sentAt?: string
}

/**
 * Notifications provider interface. Providers implement specific channels
 * (webhook, Slack, email, etc.).
 *
 * Bonded as named providers: bond('notifications', 'webhook', provider)
 */
export interface NotificationsProvider {
  /** The channel name (e.g. 'webhook', 'slack', 'email'). */
  readonly name: string

  /**
   * Sends a notification through this channel.
   *
   * @param notification - The notification to send.
   * @returns The result of the send attempt.
   */
  send(notification: Notification): Promise<NotificationResult>
}
