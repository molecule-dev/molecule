/**
 * Type definitions for React Native clipboard provider.
 *
 * @module
 */

/**
 * Configuration for the React Native clipboard provider.
 */
export interface ReactNativeClipboardConfig {
  /**
   * Whether to poll for clipboard changes (iOS only).
   * @default false
   */
  pollForChanges?: boolean

  /**
   * Polling interval in milliseconds (if pollForChanges is true).
   * @default 1000
   */
  pollInterval?: number
}
