/**
 * Configuration for the hotkeys provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface HotkeysConfig {
  /** Default scope for shortcuts. Defaults to `'all'`. */
  defaultScope?: string

  /** Whether shortcuts are enabled initially. Defaults to `true`. */
  enabled?: boolean
}
