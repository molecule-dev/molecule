/**
 * Type definitions for React Native lifecycle provider.
 *
 * @module
 */

/**
 * Configuration for the React Native lifecycle provider.
 */
export interface ReactNativeLifecycleConfig {
  /**
   * Whether to track deep link URL open events.
   * @default true
   */
  trackUrlOpen?: boolean

  /**
   * Whether to track memory warnings.
   * @default true
   */
  trackMemoryWarnings?: boolean

  /**
   * URL for active connectivity checks.
   * Should return a fast, lightweight response (e.g. HTTP 204).
   * @default 'https://clients3.google.com/generate_204'
   */
  connectivityCheckUrl?: string

  /**
   * Timeout in milliseconds for connectivity checks.
   * @default 5000
   */
  connectivityCheckTimeout?: number
}
