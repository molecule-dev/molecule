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
   * Android notification channel ID. (Reserved — not currently applied by the provider.)
   */
  androidChannelId?: string

  /**
   * Android notification channel name. (Reserved — not currently applied by the provider.)
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
