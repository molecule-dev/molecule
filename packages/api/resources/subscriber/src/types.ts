/**
 * Subscriber types.
 *
 * Status-page-style "subscribe to incident updates" + newsletter-signup-style
 * subscribers. A subscriber records a single channel/address pair (email, sms,
 * or webhook) and is verified via a one-time confirm token; opt-out is one-click
 * via a separate unsubscribe token.
 *
 * @module
 */

/**
 * Delivery channels supported for subscribers.
 */
export type SubscriberChannel = 'email' | 'sms' | 'webhook'

/**
 * All valid subscriber channels.
 */
export const SUBSCRIBER_CHANNELS: readonly SubscriberChannel[] = [
  'email',
  'sms',
  'webhook',
] as const

/**
 * Lifecycle status of a subscriber.
 *
 * - `pending` — created but not yet confirmed via the confirm token.
 * - `confirmed` — confirmed and eligible to receive deliveries.
 * - `unsubscribed` — opted out via the unsubscribe token; preserved for audit
 *   so the same address cannot silently re-subscribe and re-trigger sends.
 */
export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed'

/**
 * All valid subscriber statuses.
 */
export const SUBSCRIBER_STATUSES: readonly SubscriberStatus[] = [
  'pending',
  'confirmed',
  'unsubscribed',
] as const

/**
 * A subscriber record.
 */
export interface Subscriber {
  /** Unique subscriber identifier. */
  id: string
  /** Delivery channel (email, sms, or webhook). */
  channel: SubscriberChannel
  /** Channel-specific address: email address, E.164 phone number, or webhook URL. */
  address: string
  /**
   * Optional grouping topic — e.g. `"incident-updates"`, `"weekly-newsletter"`,
   * or `"service:api"`. The same address may subscribe to multiple topics
   * (each as its own record).
   */
  topic: string | null
  /** Lifecycle status. */
  status: SubscriberStatus
  /** Arbitrary subscriber metadata (locale, source page, etc.). */
  metadata: Record<string, unknown> | null
  /** Timestamp the subscription was confirmed (null while pending). */
  confirmedAt: string | null
  /** Timestamp the subscriber unsubscribed (null while still subscribed). */
  unsubscribedAt: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}

/**
 * Public-safe view of a subscriber. Tokens are intentionally omitted — they
 * are returned exactly once on creation and otherwise never leave the database.
 */
export type PublicSubscriber = Subscriber

/**
 * Input for creating a subscriber.
 */
export interface CreateSubscriberInput {
  /** Delivery channel. */
  channel: SubscriberChannel
  /** Channel-specific address. */
  address: string
  /** Optional grouping topic. */
  topic?: string | null
  /** Arbitrary subscriber metadata. */
  metadata?: Record<string, unknown> | null
}

/**
 * Result of creating a subscriber. Includes the one-time confirm token so the
 * caller can build the confirmation link before the token disappears.
 */
export interface CreateSubscriberResult {
  /** The created subscriber. */
  subscriber: PublicSubscriber
  /** One-time token to confirm the subscription. Returned only on creation. */
  confirmToken: string
  /** Token to unsubscribe. Returned only on creation. */
  unsubscribeToken: string
}

/**
 * Query options for listing subscribers.
 */
export interface SubscriberQuery {
  /** Filter by channel. */
  channel?: SubscriberChannel
  /** Filter by status. */
  status?: SubscriberStatus
  /** Filter by topic. */
  topic?: string
  /** Page number (1-based). */
  page?: number
  /** Items per page. */
  limit?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The page of results. */
  data: T[]
  /** Total number of matching records. */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}

/**
 * Internal database row for a subscriber. Includes private token fields.
 */
export interface SubscriberRow {
  /** Unique subscriber identifier. */
  id: string
  /** Delivery channel. */
  channel: string
  /** Channel-specific address. */
  address: string
  /** Optional grouping topic. */
  topic: string | null
  /** Lifecycle status. */
  status: string
  /** Confirm token (private — never returned via the public listing endpoint). */
  confirmToken: string
  /** Unsubscribe token (private). */
  unsubscribeToken: string
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Timestamp the subscription was confirmed. */
  confirmedAt: string | null
  /** Timestamp the subscriber unsubscribed. */
  unsubscribedAt: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
