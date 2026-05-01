/**
 * Notification preferences resource type definitions.
 *
 * Per-user channel toggles, keyed by canonical event-type slug. Each entry maps
 * a notification type (e.g. `order.shipped`, `streak.at_risk`) to a record of
 * channel booleans. Default policy when no row or no key exists is "enabled" —
 * `isEnabled()` is the canonical delivery gate.
 *
 * @module
 */

/**
 * Canonical notification-type slug (e.g. `order.shipped`, `streak.at_risk`).
 *
 * Aliased to `string` so applications can declare their own union of slugs
 * without coupling this package to any particular taxonomy.
 */
export type NotificationType = string

/**
 * Delivery channel name. Channels map 1:1 to dispatch bonds
 * (email / push / sms / in-app inbox).
 */
export type NotificationChannel = 'email' | 'push' | 'sms' | 'inApp'

/**
 * Per-channel enablement booleans for a single notification type.
 */
export interface NotificationChannelToggles {
  /** Whether email delivery is enabled for this type. */
  email: boolean
  /** Whether push delivery is enabled for this type. */
  push: boolean
  /** Whether SMS delivery is enabled for this type. */
  sms: boolean
  /** Whether in-app inbox delivery is enabled for this type. */
  inApp: boolean
}

/**
 * Full preferences map: notification-type → per-channel toggles.
 */
export type NotificationPreferences = Record<NotificationType, NotificationChannelToggles>

/**
 * Partial update payload — any subset of types, any subset of channels.
 *
 * `updatePreferences()` deep-merges this into the stored map; missing keys
 * preserve their existing values rather than reverting to defaults.
 */
export type NotificationPreferencesPatch = Record<
  NotificationType,
  Partial<NotificationChannelToggles>
>

/**
 * Persisted row shape in `notifications_preferences`.
 *
 * Single row per user; `preferences` is a JSONB column holding the full
 * type→channel-toggles map.
 */
export interface NotificationPreferencesRow {
  /** Owning user identifier. */
  userId: string
  /** The full preferences map. */
  preferences: NotificationPreferences
  /** When the row was created (ISO 8601). */
  createdAt: string
  /** When the row was last updated (ISO 8601). */
  updatedAt: string
}
