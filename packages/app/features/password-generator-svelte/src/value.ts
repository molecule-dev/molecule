/**
 * Svelte actions reproducing react-dom's controlled `value` and `checked`
 * handling for the password generator's raw inputs.
 *
 * Svelte's `value={x}` / `checked={x}` write only the live DOM property,
 * while a React input carries BOTH: `value` sets the property and the `value`
 * attribute (through `defaultValue`), and a controlled checkbox carries the
 * `checked` attribute written once at mount and only the property afterwards.
 * The other framework ports get this for free — Vue writes both for a `value`
 * prop and needs an explicit ref for the checkbox attribute, Solid uses
 * `attr:value`, Angular binds `[attr.value]` and a one-time `[attr.checked]` —
 * and `@molecule/app-ui-svelte` ships the same logic for its own `Input`
 * (`reactInputValue` in its `src/dom.ts`, not exported). This package's raw
 * inputs need the same writes, so these actions re-apply React's documented
 * behavior.
 *
 * @module
 */

/**
 * Applies a controlled value the way react-dom applies it: through the `value`
 * property (the live value) and the `defaultValue` property (whose reflection
 * is the DOM `value` attribute), so both reads of the field agree.
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

/**
 * Applies a controlled checkbox the way react-dom applies it: the `checked`
 * attribute from the mount state (react-dom's `defaultChecked`, written once
 * and never updated) and the live `checked` property from the current state.
 *
 * @param node - The checkbox input.
 * @param props - The current state and the mount (`initial`) state.
 * @returns The action's update, re-applying on a changed state.
 */
export function reactChecked(
  node: HTMLInputElement,
  props: { checked?: boolean; initial?: boolean },
): { update: (next: { checked?: boolean; initial?: boolean }) => void } {
  const apply = (next: { checked?: boolean; initial?: boolean }): void => {
    const initial = next.initial ?? false
    if (node.defaultChecked !== initial) node.defaultChecked = initial
    const checked = next.checked ?? false
    if (node.checked !== checked) node.checked = checked
  }
  apply(props)
  return { update: apply }
}
