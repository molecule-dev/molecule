/**
 * Field-driven filter-bar types.
 *
 * A filter bar is configured with an array of `FilterField`s — each field
 * knows its type, its i18n-keyed label, and the available options (for
 * select/multi fields). Consumers own the filter state and receive
 * updates via `onChange`.
 *
 * @module
 */

/** Common properties shared by every filter field variant. */
export interface FilterFieldBase {
  /** Unique field id — used as the state key. */
  id: string
  /** Display label (usually `t('...')`). */
  label: string
  /** Optional placeholder inside the control. */
  placeholder?: string
}

/** A free-text input filter field. */
export interface FilterFieldText extends FilterFieldBase {
  type: 'text'
}

/** A single-value dropdown select filter field. */
export interface FilterFieldSelect extends FilterFieldBase {
  type: 'select'
  options: Array<{ value: string; label: string }>
}

/** A multi-select filter field allowing multiple chosen values. */
export interface FilterFieldMulti extends FilterFieldBase {
  type: 'multi'
  options: Array<{ value: string; label: string }>
}

/** A date-range filter field with optional from/to bounds. */
export interface FilterFieldDateRange extends FilterFieldBase {
  type: 'date-range'
}

/** Discriminated union of all supported filter field types. */
export type FilterField =
  | FilterFieldText
  | FilterFieldSelect
  | FilterFieldMulti
  | FilterFieldDateRange

/** Flat value map keyed by field id. */
export type FilterValues = Record<
  string,
  string | string[] | { from?: string; to?: string } | undefined
>
