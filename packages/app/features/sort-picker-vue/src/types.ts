/**
 * Types for the Vue sort-by picker.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single option entry for the SortPicker select list. */
export interface SortOption<T extends string = string> {
  value: T
  /**
   * Option label. A native `<select>`/`<option>` can only display text,
   * so this is a plain `string` — it is rendered as the option's text
   * child (never `String()`-coerced). For a rich label above/beside the
   * control, use the {@link SortPickerProps.label} prop, which accepts a
   * node.
   */
  label: string
}

/** Props accepted by the {@link SortPicker} component (the React package's props). */
export interface SortPickerProps<T extends string = string> {
  /** The currently selected option value. */
  value: T
  /** Called with the selected value when the user picks an option. */
  onChange: (value: T) => void
  /** The options to list. */
  options: SortOption<T>[]
  /**
   * Optional label rendered above or to the left of the select. A node
   * value renders as nodes — it is never stringified. It arrives as a prop
   * or as the same-named slot; both work. When you pass a non-string node,
   * also pass {@link SortPickerProps.ariaLabel} to give the select an
   * accessible name.
   */
  label?: VNodeChild
  /**
   * Accessible name for the underlying `<select>`. Defaults to `label`
   * when it is a plain string, otherwise the translated "Sort by".
   */
  ariaLabel?: string
  /** Where to render the label. Defaults to `'inline'`. */
  labelPosition?: 'inline' | 'above'
  /** Extra classes. */
  className?: string
}
