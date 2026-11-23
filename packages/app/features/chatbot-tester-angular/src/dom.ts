/**
 * DOM helpers shared by the Angular chatbot-tester components.
 *
 * @module
 */

/**
 * Reproduces react-dom's controlled-`<select>` selection: the option whose
 * value matches is selected, and when nothing matches the first non-disabled
 * option is. React never assigns `select.value`, so assigning it here would
 * deselect everything for a value no option carries.
 *
 * @param select - The `<select>` element.
 * @param value - The controlled value (React's `value ?? ''`).
 */
export const applyReactSelectSelection = (
  select: HTMLSelectElement | null | undefined,
  value: string,
): void => {
  if (!select) return
  let fallback: HTMLOptionElement | null = null
  for (const option of Array.from(select.options)) {
    if (option.value === value) {
      option.selected = true
      return
    }
    if (fallback === null && !option.disabled) fallback = option
  }
  if (fallback) fallback.selected = true
}

/**
 * React's truthiness for a node value (`{node ? … : null}`), over the values
 * Angular can receive for a node-input: a template reference, a string, a
 * number, or nothing.
 *
 * @param value - The node value.
 * @returns True when React would render it.
 */
export const nodeTruthy = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== false && value !== '' && value !== 0

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text, or `''` when there is nothing.
 */
export const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)
