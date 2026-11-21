/**
 * Helpers shared by the Svelte properties-panel primitives: React's
 * truthiness rule for an optional region, the generated radio-group name, and
 * the actions that write a native input's controlled state the way React does.
 *
 * @module
 */

/**
 * Whether React would render an optional node prop (`footer && …`): nothing for
 * `null`, `undefined`, `false` and the empty string, everything else.
 *
 * @param value - The node-valued prop (a snippet or a string).
 * @returns True when the region renders.
 */
export const renders = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== false && value !== ''

/**
 * Source of the generated per-group radio name. The name only ties one group's
 * radios together (one checked at a time, one Tab stop), so any value unique to
 * the instance works; React's binding uses `useId()` for the same job.
 */
let nextGeneratedName = 0

/**
 * A fresh group name, unique to one radio group instance.
 *
 * @returns The generated name.
 */
export const generatedName = (): string => `mol-node-editor-radio-${nextGeneratedName++}`

/**
 * Writes a controlled radio's or checkbox's `checked` state the way React
 * writes it: the property and the reflected attribute at creation, the
 * property only on later updates.
 *
 * @param node - The input element.
 * @param checked - The controlled value.
 * @returns The action's update hook.
 */
export function reflectChecked(
  node: HTMLInputElement,
  checked: boolean,
): { update(next: boolean): void } {
  node.checked = checked
  if (checked) node.setAttribute('checked', '')
  else node.removeAttribute('checked')
  return {
    update(next: boolean) {
      node.checked = next
    },
  }
}

/**
 * Writes a native radio's `value` the way React writes it: the property and
 * the reflected attribute.
 *
 * @param node - The input element.
 * @param value - The option's value.
 * @returns The action's update hook.
 */
export function radioValue(node: HTMLInputElement, value: string): { update(next: string): void } {
  node.value = value
  node.setAttribute('value', value)
  return {
    update(next: string) {
      node.value = next
      node.setAttribute('value', next)
    },
  }
}

/**
 * Writes a controlled range input's value the way React writes it: the
 * property AND the content attribute (via `defaultValue`), re-applied when the
 * prop changes.
 *
 * @param node - The input element.
 * @param value - The controlled value.
 * @returns The action's update hook.
 */
export function rangeValue(node: HTMLInputElement, value: number): { update(next: number): void } {
  const apply = (next: number): void => {
    const text = String(next)
    if (node.value !== text) node.value = text
    if (node.defaultValue !== text) node.defaultValue = text
  }
  apply(value)
  return {
    update(next: number) {
      apply(next)
    },
  }
}
