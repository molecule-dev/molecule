/**
 * Type definitions for React Native status bar provider.
 *
 * @module
 */

/**
 * Configuration for the React Native status bar provider.
 */
export interface ReactNativeStatusBarConfig {
  /**
   * Initial background color.
   */
  initialBackgroundColor?: string

  /**
   * Initial bar style.
   * @default 'default'
   */
  initialStyle?: 'dark' | 'light' | 'default'

  /**
   * Whether to use animations for changes.
   * @default true
   */
  animated?: boolean
}
