/**
 * Type definitions for React Native push notifications provider.
 *
 * @module
 */

/**
 * Configuration for the React Native push notifications provider.
 */
export interface ReactNativePushConfig {
  /**
   * Android notification channel ID. On Android the provider creates (or updates)
   * this channel via expo-notifications' `setNotificationChannelAsync` during
   * `register()`, and targets it when scheduling local notifications (unless a
   * per-notification `channelId` overrides it). Android 8+ requires a channel for
   * notifications to display, and server push payloads target it by id. No-op on
   * iOS/web; when omitted, expo's default channel is used.
   */
  androidChannelId?: string

  /**
   * Human-readable name shown for the Android channel in the system notification
   * settings. Applied only when `androidChannelId` is set; defaults to the channel
   * id when omitted. Ignored on iOS/web.
   */
  androidChannelName?: string

  /**
   * EAS `projectId` used when requesting an Expo push token. Required on Expo
   * SDK 49+ standalone/EAS builds — `getExpoPushTokenAsync` throws without it
   * outside Expo Go. When omitted, the provider falls back to the value in the
   * Expo config (`app.json` `extra.eas.projectId`, read via `expo-constants`).
   */
  projectId?: string

  /**
   * Whether to handle notifications when the app is in the foreground.
   * @default true
   */
  handleForeground?: boolean
}
