/**
 * Configuration for the Howler audio provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface HowlerConfig {
  /**
   * Use HTML5 Audio instead of the Web Audio API as the default backend for
   * every player this provider creates (maps to Howler's `html5` option — best
   * for large/streamed files). Defaults to `false`.
   */
  html5?: boolean

  /**
   * Global volume applied to all sounds via Howler's global `Howler.volume(...)`
   * when the provider is created (0.0 to 1.0). Left untouched when omitted.
   */
  volume?: number
}
