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
 * Result of sending a single push notification.
 */
export interface SendResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

/**
 * Result entry when sending to multiple subscriptions.
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
   * Sends a push notification to a single subscription endpoint.
   */
  send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult>

  /**
   * Sends a push notification to multiple subscriptions, handling
   * partial failures gracefully.
   */
  sendMany(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
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
