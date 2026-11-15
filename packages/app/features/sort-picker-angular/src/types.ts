/**
 * Types of `@molecule/app-sort-picker-angular` — the Angular counterpart of
 * `@molecule/app-sort-picker-react`, same props and DOM.
 *
 * @module
 */

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

/** Props accepted by {@link SortPicker} — the same props the React package accepts. */
export interface SortPickerProps<T extends string = string> {
  /** The currently selected option value. */
  value: T
  /** Called with the selected value when the user picks an option. */
  onChange: (value: T) => void
  /** The options to list. */
  options: SortOption<T>[]
  /**
   * Optional label rendered above or to the left of the select. A node
   * value is projected content (`[slot=label]`) and renders as nodes — it is
   * never stringified; a plain string renders as text. When you pass a node,
   * also pass {@link SortPickerProps.ariaLabel} to give the select an
   * accessible name.
   */
  label?: unknown
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
