/**
 * Default date range picker provider implementation.
 *
 * @module
 */

import type {
  DateRange,
  DateRangeInstance,
  DateRangeOptions,
  DateRangePickerProvider,
} from '@molecule/app-date-range-picker'

import type { DefaultDateRangeConfig } from './types.js'

/**
 * Creates a default date range picker provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured DateRangePickerProvider.
 */
export function createProvider(_config?: DefaultDateRangeConfig): DateRangePickerProvider {
  return {
    name: 'default',

    createPicker(options: DateRangeOptions): DateRangeInstance {
      let currentRange: DateRange | null = null

      if (options.startDate && options.endDate) {
        currentRange = {
          startDate: new Date(options.startDate),
          endDate: new Date(options.endDate),
        }
      }

      return {
        getValue(): DateRange | null {
          return currentRange ? { ...currentRange } : null
        },

        setValue(range: DateRange): void {
          currentRange = {
            startDate: new Date(range.startDate),
            endDate: new Date(range.endDate),
          }
          options.onChange?.(currentRange)
        },

        clear(): void {
          currentRange = null
        },

        open(): void {
          // Opens the picker UI — handled by framework bindings
        },

        close(): void {
          // Closes the picker UI — handled by framework bindings
        },

        destroy(): void {
          currentRange = null
        },
      }
    },
  }
}

/** Default date range picker provider instance. */
export const provider: DateRangePickerProvider = createProvider()
