/**
 * DOM helpers for the Svelte moderation queue.
 *
 * @module
 */

/** The live state of a controlled checkbox (React's `checked` + `indeterminate`). */
export interface CheckedState {
  /** Whether the box is checked. */
  checked: boolean
  /** Whether the box draws the indeterminate dash. */
  indeterminate?: boolean
}

/**
 * Writes a checkbox's `checked` and `indeterminate` state the way React writes
 * a controlled input: the `checked` property and the reflected `checked`
 * attribute when the input is created, and only the live properties on later
 * updates. A `checked` binding rewrites the attribute on every update, so the
 * queue writes `checked` through this action instead — a box created unchecked
 * and checked afterwards then has no attribute, and one created checked and
 * unchecked keeps it, exactly as React renders it.
 *
 * @param node - The checkbox.
 * @param value - Whether it is checked, and whether it draws the dash.
 * @returns The action's update hook, for later values.
 */
export function reflectChecked(
  node: HTMLInputElement,
  value: CheckedState,
): { update: (next: CheckedState) => void } {
  node.checked = value.checked
  if (value.checked) node.setAttribute('checked', '')
  else node.removeAttribute('checked')
  node.indeterminate = value.indeterminate ?? false
  return {
    update: (next: CheckedState): void => {
      node.checked = next.checked
      node.indeterminate = next.indeterminate ?? false
    },
  }
}
