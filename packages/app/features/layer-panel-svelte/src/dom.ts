/**
 * DOM handling for the layer name input.
 *
 * @module
 */

/**
 * Sets an input's initial value as the `value` ATTRIBUTE, which is what
 * React's `defaultValue` prop does. The attribute fixes the field's default
 * value and leaves the live value alone once the user types; a `value` prop
 * would instead be re-applied on every update.
 *
 * The action never re-applies the value: React's `defaultValue` only takes
 * effect when the field mounts, so it returns no `update`.
 *
 * @param node - The input element.
 * @param value - The initial value.
 */
export function defaultInputValue(node: HTMLInputElement, value: string): void {
  node.setAttribute('value', value)
}
