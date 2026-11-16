/**
 * Svelte action reproducing react-dom's controlled-input `value` handling for
 * the amount field.
 *
 * Svelte's `value={x}` sets only the `value` property, while a React input
 * carries BOTH the property and the `value` attribute (react-dom applies the
 * value through the `defaultValue` property, whose reflection IS that
 * attribute). The other framework ports get this for free — Vue writes both
 * for a plain `value` prop, Solid uses the attribute alongside the property,
 * Angular binds `[attr.value]` — and `@molecule/app-ui-svelte` ships the same
 * logic for its own `Input` (`reactInputValue` in its `src/dom.ts`, not
 * exported). This action applies React's documented behavior: the property,
 * then the attribute, on mount and on every value change.
 *
 * @module
 */

/**
 * Applies `props.value` to the input the way react-dom applies a controlled
 * `value`: through the `value` property (the live value) and the `value`
 * attribute, so both reads of the field agree.
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
    const text = value === undefined || value === null ? '' : String(value)
    if (node.value !== text) node.value = text
    if (node.getAttribute('value') !== text) node.setAttribute('value', text)
  }
  apply(props)
  return { update: apply }
}
