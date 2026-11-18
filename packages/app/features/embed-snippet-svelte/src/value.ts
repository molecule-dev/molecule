/**
 * Svelte actions and helpers reproducing react-dom's controlled form-element
 * behavior for the embed-snippet's controls.
 *
 * A React input carries BOTH the `value` property and the `value` attribute
 * (react-dom applies the prop through the live value and through
 * `defaultValue`, whose reflection is the attribute); a React `<select>` keeps
 * its selection on the matching option and falls back to the first option when
 * no value matches (`updateOptions`). Svelte writes only the property, so these
 * helpers make the two reads of the field agree and give the select React's
 * fallback.
 *
 * @module
 */

/**
 * Applies a controlled text input's value the way react-dom does: the `value`
 * property (the live value) and the `value` attribute, so both reads of the
 * field agree.
 *
 * @param node - The input element.
 * @param text - The value the case's props currently hold.
 */
export function applyInputValue(node: HTMLInputElement, text: string): void {
  if (node.value !== text) node.value = text
  if (node.getAttribute('value') !== text) node.setAttribute('value', text)
}

/**
 * Applies a controlled `<select>`'s value the way react-dom's `updateOptions`
 * does: select the option whose value matches, else the first non-disabled
 * option, else nothing.
 *
 * @param node - The select element.
 * @param desired - The value the case's props currently hold.
 */
export function applySelectValue(node: HTMLSelectElement, desired: string): void {
  const options = Array.from(node.options)
  const match = options.find((option) => option.value === desired)
  if (match) {
    match.selected = true
    return
  }
  const fallback = options.find((option) => !option.disabled)
  if (fallback) fallback.selected = true
  else node.selectedIndex = -1
}

/**
 * The option value a controlled select's selection follows for a desired
 * value: the desired value when an option carries it, else the first option.
 *
 * @param options - The rendered option values.
 * @param desired - The value the case's props currently hold.
 * @returns The value the selection follows.
 */
export function effectiveSelectValue(options: readonly string[], desired: string): string {
  if (options.includes(desired)) return desired
  const fallback = options[0]
  return fallback === undefined ? desired : fallback
}

/**
 * Svelte action applying a controlled input's value on mount and on every
 * value change.
 *
 * @param node - The input element.
 * @param props - The controlled value, as React's `<input value>` takes it.
 * @returns The action's update, re-applying on a changed value.
 */
export function reactInputValue(
  node: HTMLInputElement,
  props: { value?: unknown },
): { update: (next: { value?: unknown }) => void } {
  const apply = (next: { value?: unknown }): void => {
    const { value } = next
    if (value === undefined || value === null) {
      node.removeAttribute('value')
      return
    }
    applyInputValue(node, String(value))
  }
  apply(props)
  return { update: apply }
}

/**
 * Svelte action applying a controlled select's value on mount and on every
 * value change.
 *
 * @param node - The select element.
 * @param props - The controlled value, as React's `<select value>` takes it.
 * @returns The action's update, re-applying on a changed value.
 */
export function reactSelectValue(
  node: HTMLSelectElement,
  props: { value?: unknown },
): { update: (next: { value?: unknown }) => void } {
  const apply = (next: { value?: unknown }): void => {
    applySelectValue(
      node,
      next.value === undefined || next.value === null ? '' : String(next.value),
    )
  }
  apply(props)
  return { update: apply }
}
