/**
 * TanStack Virtual provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the TanStack Virtual scroll provider.
 */
export interface TanStackVirtualConfig {
  /**
   * Whether to enable debug mode in TanStack Virtual.
   * When `true`, TanStack logs internal state changes to the console.
   * Defaults to `false`.
   */
  debug?: boolean

  /**
   * Delay in milliseconds before the `isScrolling` state resets to `false`
   * after scrolling stops. Defaults to `150`.
   */
  isScrollingResetDelay?: number

  /**
   * Whether to use the native `scrollend` event instead of debouncing.
   * Defaults to `false`.
   */
  useScrollendEvent?: boolean
}
