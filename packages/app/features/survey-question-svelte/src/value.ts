/**
 * A controlled input's `value`, applied the way react-dom applies it.
 *
 * Svelte's `value={x}` sets only the `value` property, while a React input
 * carries BOTH the property and the `value` attribute (react-dom applies the
 * value through `defaultValue`, whose reflection is that attribute). This
 * action applies React's behavior on mount and on every value change.
 *
 * @module
 */

/**
 * Applies a controlled value through the `value` property and the `value`
 * attribute, so both reads of the field agree.
 *
 * @param node - The input element.
 * @param props - The controlled value.
 * @returns The action's update, re-applying on a changed value.
 */
export function reactInputValue(
  node: HTMLInputElement,
  props: { value?: string },
): { update: (next: { value?: string }) => void } {
  const apply = (next: { value?: string }): void => {
    const text = next.value === undefined ? '' : next.value
    if (node.value !== text) node.value = text
    if (node.getAttribute('value') !== text) node.setAttribute('value', text)
  }
  apply(props)
  return { update: apply }
}
