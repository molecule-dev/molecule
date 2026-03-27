/**
 * Color picker types for molecule.dev.
 *
 * Defines the provider interface and data types for color selection
 * UI components.
 *
 * @module
 */

/**
 * Configuration options for creating a color picker.
 */
export interface ColorPickerOptions {
  /** Initial color value (e.g. `'#ff0000'`, `'rgb(255,0,0)'`, `'hsl(0,100%,50%)'`). */
  value?: string

  /** Color output format. Defaults to `'hex'`. */
  format?: 'hex' | 'rgb' | 'hsl'

  /** Preset color swatches for quick selection. */
  presets?: string[]

  /** Whether to show an alpha/opacity channel control. Defaults to `false`. */
  showAlpha?: boolean

  /** Whether to show a text input for manual color entry. Defaults to `true`. */
  showInput?: boolean

  /** Callback when the selected color changes. */
  onChange?: (color: string) => void
}

/**
 * A live color picker instance returned by the provider.
 */
export interface ColorPickerInstance {
  /**
   * Returns the current color value as a formatted string.
   *
   * @returns The current color in the configured format.
   */
  getValue(): string

  /**
   * Sets the color value programmatically.
   *
   * @param color - Color value string (hex, rgb, or hsl).
   */
  setValue(color: string): void

  /**
   * Returns the current output format.
   *
   * @returns The active color format.
   */
  getFormat(): string

  /**
   * Changes the output format.
   *
   * @param format - The color format to use.
   */
  setFormat(format: 'hex' | 'rgb' | 'hsl'): void

  /**
   * Destroys the picker instance and cleans up resources.
   */
  destroy(): void
}

/**
 * Color picker provider interface.
 *
 * All color picker providers must implement this interface to create
 * and manage color selection UI.
 */
export interface ColorPickerProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new color picker instance.
   *
   * @param options - Configuration for the picker.
   * @returns A color picker instance.
   */
  createPicker(options: ColorPickerOptions): ColorPickerInstance
}
