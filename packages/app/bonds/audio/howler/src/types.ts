/**
 * Configuration for the Howler audio provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface HowlerConfig {
  /** Whether to use HTML5 Audio instead of Web Audio API. Defaults to `false`. */
  html5?: boolean

  /** Global volume for all sounds. Defaults to `1.0`. */
  volume?: number
}
