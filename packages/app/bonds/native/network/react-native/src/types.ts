/**
 * Type definitions for React Native network status provider.
 *
 * @module
 */

/**
 * Configuration for the React Native network provider.
 */
export interface ReactNativeNetworkConfig {
  /**
   * URL to use for active connectivity checks.
   * @default 'https://clients3.google.com/generate_204'
   */
  connectivityCheckUrl?: string

  /**
   * Timeout in milliseconds for connectivity checks.
   * @default 5000
   */
  connectivityCheckTimeout?: number
}
