/**
 * DateRangePicker provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete date-range-picker implementation.
 *
 * @module
 */

/**
 *
 */
export interface DateRangePickerProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface DateRangePickerConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
