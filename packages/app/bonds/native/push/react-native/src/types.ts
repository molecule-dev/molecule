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
   * Whether to handle notifications when the app is in the foreground.
   * @default true
   */
  handleForeground?: boolean
}
