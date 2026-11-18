/**
 * DOM helpers for the Svelte admin table.
 *
 * @module
 */

/**
 * Writes a checkbox's `checked` state the way React writes a controlled input:
 * the property and the reflected `checked` attribute when the input is
 * created, and only the property on later updates. A `checked` binding
 * rewrites the attribute on every update, so the table writes `checked`
 * through this action instead — a box created unchecked and checked
 * afterwards then has no attribute, and one created checked and unchecked
 * keeps it, exactly as React renders it.
 *
 * @param node - The checkbox.
 * @param value - Whether it is checked.
 * @returns The action's update hook, for later values.
 */
export function reflectChecked(
  node: HTMLInputElement,
  value: boolean,
): { update: (next: boolean) => void } {
  node.checked = value
  if (value) node.setAttribute('checked', '')
  else node.removeAttribute('checked')
  return {
    update: (next: boolean): void => {
      node.checked = next
    },
  }
}
