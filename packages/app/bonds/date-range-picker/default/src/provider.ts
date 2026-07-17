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
 * Clamps a date into the inclusive `[minDate, maxDate]` window. A missing bound
 * imposes no limit on that side.
 *
 * @param date - The date to constrain.
 * @param minDate - Optional lower bound (inclusive).
 * @param maxDate - Optional upper bound (inclusive).
 * @returns A new `Date` clamped into the window.
 */
function clampDate(date: Date, minDate?: Date, maxDate?: Date): Date {
  let time = date.getTime()
  if (minDate && time < minDate.getTime()) {
    time = minDate.getTime()
  }
  if (maxDate && time > maxDate.getTime()) {
    time = maxDate.getTime()
  }
  return new Date(time)
}

/**
 * Creates a default date range picker provider.
 *
 * @param config - Optional provider configuration. `config.singleDate` supplies
 *   the default single-date mode for every picker that does not pass its own
 *   per-call `options.singleDate`.
 * @returns A configured DateRangePickerProvider.
 */
export function createProvider(config: DefaultDateRangeConfig = {}): DateRangePickerProvider {
  return {
    name: 'default',

    createPicker(options: DateRangeOptions): DateRangeInstance {
      const { minDate, maxDate } = options
      const singleDate = options.singleDate ?? config.singleDate ?? false

      /**
       * Normalizes a raw range against this picker's constraints: single-date
       * mode collapses the selection to a single day; `minDate`/`maxDate` clamp
       * both ends into range. Clamping (not rejection) matches the core
       * contract, which describes these as "min/max clamps".
       */
      const normalize = (range: DateRange): DateRange => {
        if (singleDate) {
          const day = clampDate(new Date(range.startDate), minDate, maxDate)
          return { startDate: day, endDate: new Date(day) }
        }
        return {
          startDate: clampDate(new Date(range.startDate), minDate, maxDate),
          endDate: clampDate(new Date(range.endDate), minDate, maxDate),
        }
      }

      let currentRange: DateRange | null = null

      if (options.startDate && options.endDate) {
        currentRange = normalize({ startDate: options.startDate, endDate: options.endDate })
      } else if (singleDate && options.startDate) {
        currentRange = normalize({ startDate: options.startDate, endDate: options.startDate })
      }

      return {
        getValue(): DateRange | null {
          return currentRange ? { ...currentRange } : null
        },

        setValue(range: DateRange): void {
          currentRange = normalize(range)
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
