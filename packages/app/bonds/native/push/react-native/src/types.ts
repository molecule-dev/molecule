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
   * Android notification channel ID.
   */
  androidChannelId?: string

  /**
   * Android notification channel name.
   */
  androidChannelName?: string

  /**
   * Whether to handle notifications when the app is in the foreground.
   * @default true
   */
  handleForeground?: boolean
}
