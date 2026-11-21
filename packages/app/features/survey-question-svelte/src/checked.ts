/**
 * A controlled radio's `checked` DOM state, written the way React writes it.
 *
 * React sets the `checked` property and the reflected `checked` attribute when
 * it creates the input, and only the property on every later render. Svelte's
 * `checked={x}` writes only the property, so the matrix control reflects the
 * created state through this action.
 *
 * @module
 */

/**
 * Keeps a radio's `checked` DOM state mirroring a prop the way React renders a
 * controlled input: on mount both the property and the reflected attribute are
 * set; on update only the property.
 *
 * @param node - The radio input to keep in sync.
 * @param value - Whether the radio is checked.
 * @returns The action with an update that re-syncs on prop changes.
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
