/**
 * ColorPicker provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete color-picker implementation.
 *
 * @module
 */

/**
 *
 */
export interface ColorPickerProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface ColorPickerConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
