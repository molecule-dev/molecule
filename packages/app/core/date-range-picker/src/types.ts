/**
 * Date range picker types for molecule.dev.
 *
 * Defines the provider interface and data types for date range
 * selection UI components.
 *
 * @module
 */

/**
 * A date range with start and end dates.
 */
export interface DateRange {
  /** Start date of the range. */
  startDate: Date

  /** End date of the range. */
  endDate: Date
}

/**
 * A named preset date range for quick selection.
 */
export interface DatePreset {
  /** Display label for the preset (e.g. "Last 7 days"). */
  label: string

  /** The date range this preset represents. */
  range: DateRange
}

/**
 * Configuration options for creating a date range picker.
 */
export interface DateRangeOptions {
  /** Initial start date. */
  startDate?: Date

  /** Initial end date. */
  endDate?: Date

  /** Minimum selectable date. */
  minDate?: Date

  /** Maximum selectable date. */
  maxDate?: Date

  /** Quick-select preset date ranges. */
  presets?: DatePreset[]

  /** Callback when the selected range changes. */
  onChange?: (range: DateRange) => void

  /** Locale string for date formatting (e.g. `'en-US'`). */
  locale?: string

  /** Whether to select a single date instead of a range. Defaults to `false`. */
  singleDate?: boolean
}

/**
 * A live date range picker instance returned by the provider.
 */
export interface DateRangeInstance {
  /**
   * Returns the currently selected date range.
   *
   * @returns The selected date range, or `null` if none selected.
   */
  getValue(): DateRange | null

  /**
   * Sets the selected date range programmatically.
   *
   * @param range - The date range to set.
   */
  setValue(range: DateRange): void

  /**
   * Clears the current selection.
   */
  clear(): void

  /**
   * Opens the picker UI.
   */
  open(): void

  /**
   * Closes the picker UI.
   */
  close(): void

  /**
   * Destroys the picker instance and cleans up resources.
   */
  destroy(): void
}

/**
 * Date range picker provider interface.
 *
 * All date range picker providers must implement this interface
 * to create and manage date range selection UI.
 */
export interface DateRangePickerProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new date range picker instance.
   *
   * @param options - Configuration for the picker.
   * @returns A picker instance for managing the selection.
   */
  createPicker(options: DateRangeOptions): DateRangeInstance
}
