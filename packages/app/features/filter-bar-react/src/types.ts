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

/**
 *
 */
export interface FilterFieldBase {
  /** Unique field id — used as the state key. */
  id: string
  /** Display label (usually `t('...')`). */
  label: string
  /** Optional placeholder inside the control. */
  placeholder?: string
}

/**
 *
 */
export interface FilterFieldText extends FilterFieldBase {
  type: 'text'
}

/**
 *
 */
export interface FilterFieldSelect extends FilterFieldBase {
  type: 'select'
  options: Array<{ value: string; label: string }>
}

/**
 *
 */
export interface FilterFieldMulti extends FilterFieldBase {
  type: 'multi'
  options: Array<{ value: string; label: string }>
}

/**
 *
 */
export interface FilterFieldDateRange extends FilterFieldBase {
  type: 'date-range'
}

/**
 *
 */
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
