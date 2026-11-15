/**
 * Svelte action reproducing react-dom's controlled-input `value` handling for
 * the copy-link field's read-only input.
 *
 * Svelte's `value={x}` sets only the `value` property, while a React input
 * carries BOTH the property and the `value` attribute (react-dom applies the
 * value through the `defaultValue` property, whose reflection IS that
 * attribute). The other framework ports get this for free — Vue writes both
 * for a plain `value` prop, Solid uses `attr:value`, Angular binds
 * `[attr.value]` — and `@molecule/app-ui-svelte` ships the same logic for its
 * own `Input`. This package's raw input needs the same two writes.
 *
 * @module
 */

/**
 * Applies `props.value` to the input the way react-dom applies a controlled
 * `value`: through the `value` property (the live value) and the
 * `defaultValue` property (whose reflection is the DOM `value` attribute), so
 * both reads of the field agree.
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
    const text = String(value)
    if (node.value !== text) node.value = text
    if (node.defaultValue !== text) node.defaultValue = text
  }
  apply(props)
  return { update: apply }
}
