/**
 * Type definitions for the push notification provider interface.
 *
 * These types are provider-agnostic — no dependency on any push notification
 * library (e.g. web-push). Concrete providers implement the
 * `PushNotificationProvider` interface and are wired via the bond system.
 *
 * @module
 */

/**
 * A push subscription representing a client endpoint.
 */
export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Notification payload structure.
 */
export interface NotificationPayload {
  title: string
  options?: {
    body?: string
    icon?: string
    badge?: string
    image?: string
    tag?: string
    data?: Record<string, unknown>
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
    requireInteraction?: boolean
    silent?: boolean
  }
}

/**
 * How the push service should deliver one message: the Web Push protocol's TTL, Urgency and
 * Topic headers (RFC 8030 §5). Every field is optional; a provider leaves an unset one to the
 * push service's default.
 */
export interface SendOptions {
  /**
   * Seconds the push service keeps the message for a device that is offline, after which it
   * is dropped undelivered. `0` means deliver now or never. The web-push default is four weeks,
   * so set this for anything that goes stale (a sign-in code, a time-limited approval).
   */
  ttl?: number
  /**
   * How soon the device should be woken for it. `high` is for messages the user must act on
   * now; phones on battery saver may hold `normal` and lower.
   */
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
  /**
   * A label (up to 32 URL-safe base64 characters) that replaces any message with the same topic
   * still waiting for an offline device, so only the latest one arrives.
   */
  topic?: string
}

/**
 * Result of sending a single push notification.
 */
export interface SendResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

/**
 * Result entry when sending to multiple subscriptions.
 *
 * Exactly one of `result` / `error` is set per entry. A dead subscription
 * (HTTP 404/410 from the push service) is a FAILURE: it arrives in `error`
 * (provider errors such as web-push's `WebPushError` carry a `statusCode`),
 * never as a resolved `result` — prune stored subscriptions by inspecting
 * `error`, not `result`.
 */
export interface SendManyResult {
  subscription: PushSubscription
  result?: SendResult
  error?: Error
}

/**
 * VAPID configuration for push notification authentication.
 */
export interface VapidConfig {
  email: string
  publicKey: string
  privateKey: string
}

/**
 * VAPID key pair returned by key generation.
 */
export interface VapidKeys {
  publicKey: string
  privateKey: string
}

/**
 * Push notification provider interface that all implementations must satisfy.
 */
export interface PushNotificationProvider {
  /**
   * Configure VAPID credentials for push notifications.
   */
  configure(config?: VapidConfig): void

  /**
   * Sends a push notification to a single subscription endpoint, with optional delivery
   * settings (`options`: TTL, urgency, topic).
   */
  send(
    subscription: PushSubscription,
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<SendResult>

  /**
   * Sends a push notification to multiple subscriptions, handling
   * partial failures gracefully. `options` applies to every message.
   */
  sendMany(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
    options?: SendOptions,
  ): Promise<SendManyResult[]>

  /**
   * Generates a new VAPID key pair for push notification authentication.
   */
  generateVapidKeys(): VapidKeys

  /**
   * Returns the public VAPID key for client-side subscription requests,
   * or `undefined` if VAPID is not configured.
   */
  getPublicKey(): string | undefined
}
