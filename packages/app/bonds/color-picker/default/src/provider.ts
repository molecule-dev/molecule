/**
 * Default color picker provider implementation.
 *
 * @module
 */

import type {
  ColorPickerInstance,
  ColorPickerOptions,
  ColorPickerProvider,
} from '@molecule/app-color-picker'

import type { DefaultColorPickerConfig } from './types.js'

/**
 * Creates a default color picker provider.
 *
 * @param config - Optional provider configuration. `config.format` supplies the
 *   default color format for every picker that does not pass its own
 *   per-call `options.format`.
 * @returns A configured ColorPickerProvider.
 */
export function createProvider(config: DefaultColorPickerConfig = {}): ColorPickerProvider {
  return {
    name: 'default',

    createPicker(options: ColorPickerOptions): ColorPickerInstance {
      let currentValue = options.value ?? '#000000'
      let currentFormat: 'hex' | 'rgb' | 'hsl' = options.format ?? config.format ?? 'hex'

      return {
        getValue(): string {
          return currentValue
        },

        setValue(color: string): void {
          currentValue = color
          options.onChange?.(color)
        },

        getFormat(): string {
          return currentFormat
        },

        setFormat(format: 'hex' | 'rgb' | 'hsl'): void {
          currentFormat = format
        },

        destroy(): void {
          // Clean up resources
        },
      }
    },
  }
}

/** Default color picker provider instance. */
export const provider: ColorPickerProvider = createProvider()
