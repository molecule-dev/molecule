/**
 * Type definitions for React Native splash screen provider.
 *
 * @module
 */

/**
 * Configuration for the React Native splash screen provider.
 */
export interface ReactNativeSplashScreenConfig {
  /**
   * Whether to prevent auto-hide on app launch.
   * When true, the splash screen stays visible until explicitly hidden.
   * @default true
   */
  preventAutoHide?: boolean
}
