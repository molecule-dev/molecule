/**
 * Configuration for the hotkeys provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface HotkeysConfig {
  /**
   * hotkeys-js scope assigned to shortcuts registered without their own
   * `scope`, and set as the active scope when the provider is created. Defaults
   * to `'all'` (shortcuts under `'all'` fire regardless of the active scope).
   */
  defaultScope?: string

  /** Whether shortcuts are enabled initially. Defaults to `true`. */
  enabled?: boolean
}
