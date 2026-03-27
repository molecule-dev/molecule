/**
 * Configuration for the default color picker provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 */
export interface DefaultColorPickerConfig {
  /** Default color format. Defaults to `'hex'`. */
  format?: 'hex' | 'rgb' | 'hsl'
}
