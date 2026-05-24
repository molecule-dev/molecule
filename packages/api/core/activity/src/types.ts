/**
 * Activity capture core types for molecule.dev.
 *
 * The activity surface records outbound side effects (emails, SMS, push,
 * webhooks, channel messages) so they can be inspected in dev rather than
 * actually delivered. A bonded {@link ActivitySink} receives each
 * {@link ActivityEvent}; capture provider bonds build events from the call
 * args of the category interface they wrap.
 *
 * @module
 */

/**
 * The category of outbound side effect an {@link ActivityEvent} represents.
 */
export type ActivityType = 'email' | 'sms' | 'push' | 'webhook' | 'channel'

/**
 * The lifecycle status of a captured side effect.
 *
 * - `'captured'` — intercepted in dev, not actually delivered (synthetic success).
 * - `'sent'` — delegated to a real provider and accepted for delivery.
 * - `'delivered'` — confirmed delivered by the provider.
 * - `'failed'` — delivery (or capture) failed.
 */
export type ActivityStatus = 'captured' | 'sent' | 'delivered' | 'failed'

/**
 * A single captured outbound side effect.
 *
 * Built by a capture provider from the wrapped call's arguments, recorded
 * to the bonded {@link ActivitySink}, then surfaced in the IDE Activity panel
 * and as an inline card in the Synthase chat.
 */
export interface ActivityEvent {
  /** Unique identifier for this event (typically a UUID). */
  id: string

  /** The category of side effect this event represents. */
  type: ActivityType

  /** The lifecycle status of the side effect. */
  status: ActivityStatus

  /** Primary recipient (email address, phone number, channel id, URL, etc.). */
  recipient?: string

  /** Short human-readable label for the inline card (e.g. an email subject). */
  summary?: string

  /** Full captured payload (dev only — may contain PII). */
  payload?: unknown

  /** The result returned to the caller (synthetic or real). */
  result?: unknown

  /** When the side effect was captured, as an ISO 8601 timestamp. */
  timestamp: string
}

/**
 * Activity sink interface.
 *
 * Sink bonds implement this to persist or forward captured events — e.g. a
 * console logger for standalone scaffolded apps, or an HTTP POST to
 * molecule.dev for sandboxed/managed apps.
 */
export interface ActivitySink {
  /**
   * Records a single captured activity event.
   *
   * Implementations MUST be best-effort: a capture failure must never break
   * the calling application, so sinks should catch and log their own errors
   * rather than throwing.
   *
   * @param event - The captured activity event to record.
   */
  record(event: ActivityEvent): Promise<void>
}
