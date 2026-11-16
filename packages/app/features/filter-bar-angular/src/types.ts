/**
 * Types of `@molecule/app-filter-bar-angular` — the Angular counterpart of
 * `@molecule/app-filter-bar-react`, same props and DOM.
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
  FilterFieldText | FilterFieldSelect | FilterFieldMulti | FilterFieldDateRange

/** Flat value map keyed by field id. */
export type FilterValues = Record<
  string,
  string | string[] | { from?: string; to?: string } | undefined
>

/**
 * Props accepted by {@link FilterBar} — the same props
 * `@molecule/app-filter-bar-react` accepts. The callback props and the data
 * props are inputs of the same (React) name, so a host template binds them
 * with `[onChange]` / `[fields]` / `[values]`. `actions` is projected content
 * (`[slot=actions]`), not an input: an Angular input cannot carry nodes.
 */
export interface FilterBarProps {
  /** Field definitions. */
  fields: FilterField[]
  /** Current filter values keyed by field id. */
  values: FilterValues
  /** Called on any individual field change. */
  onChange: (next: FilterValues) => void
  /** Optional "Clear all" handler — renders a clear button when provided. */
  onClear?: () => void
  /**
   * Extra right-side actions (e.g. "Add filter", "Save view"), projected as
   * `[slot=actions]` content.
   */
  actions?: unknown
  /**
   * When `true`, renders each field's `label` above its input as a
   * 10px-uppercase-tracking-widest label (matching the polished flagship
   * apps' settings/filter sections). Default `false` keeps the original
   * unlabeled inline-row layout used by simple toolbar consumers.
   */
  showLabels?: boolean
  /** Extra classes. */
  className?: string
}
