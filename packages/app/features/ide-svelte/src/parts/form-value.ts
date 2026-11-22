/**
 * The `value` attribute React writes on a controlled `<input>`.
 *
 * React sets BOTH the DOM `value` property and the `value` ATTRIBUTE for a
 * controlled input, so its rendered `<input>` carries `value="…"` beside the
 * live property. Svelte's `value={…}` writes only the property, which shows up
 * as a detached `{value="…"}` in the conformance snapshot. This action writes
 * the attribute alongside Svelte's property update, so the element's attributes
 * equal React's for the same value. (`<textarea>` has no `value` attribute in
 * HTML — React writes its text content — so this is only for `<input>`.)
 *
 * @module
 */

/**
 * Seeds an uncontrolled field the way React's `defaultValue` does: the value
 * becomes the element's `defaultValue` once, at mount, and later state changes
 * never rewrite the field (the user's typing stays where the caret is).
 *
 * @param node - The field the action is attached to.
 * @param value - The initial value.
 */
export function defaultValueSeed(
  node: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): void {
  node.defaultValue = value
}

/**
 * Keeps an `<input>`'s `value` attribute equal to the bound value, the way
 * React's controlled input does.
 *
 * @param node - The input the action is attached to.
 * @param value - The current value.
 * @returns The action's update hook for later values.
 */
export function inputValueAttribute(
  node: HTMLInputElement,
  value: string,
): { update: (next: string) => void } {
  /**
   * Writes the current value onto the attribute.
   *
   * @param next - The value to record.
   */
  const apply = (next: string): void => {
    node.setAttribute('value', next)
  }

  apply(value)
  return { update: apply }
}
