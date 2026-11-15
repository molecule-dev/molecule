/**
 * Types for the Solid sort-by picker.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single option entry for the SortPicker select list. */
export interface SortOption<T extends string = string> {
  value: T
  /**
   * Option label. A native `<select>`/`<option>` can only display text,
   * so this is a plain `string` — it is rendered as the option's text
   * child (never `String()`-coerced). For a rich label above/beside the
   * control, use the {@link SortPickerProps.label} prop, which accepts a
   * JSX node.
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
   * Optional label rendered above or to the left of the select. Rendered as
   * JSX children, so a node (icon + text, styled element, …) displays as
   * nodes — it is never stringified. When you pass a non-string node, also
   * pass {@link SortPickerProps.ariaLabel} to give the select an accessible
   * name.
   */
  label?: JSX.Element
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
