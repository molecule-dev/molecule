/**
 * DOM helpers shared by the Svelte chatbot-tester components.
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
