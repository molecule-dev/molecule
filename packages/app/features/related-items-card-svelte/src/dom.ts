/**
 * DOM helpers for {@link RelatedItemsCard}: the row click wiring.
 *
 * React attaches `onClick` to each item `<li>` only when the caller supplied a
 * handler (its JSDoc is explicit that the rows are mouse-only, with no keyboard
 * affordance), so the listener is attached through a Svelte action instead of
 * an `onclick` attribute: the reference markup intentionally carries no
 * handler attribute.
 *
 * @module
 */

/** One row's click wiring. */
export interface RowClick<T> {
  /** The caller's handler, absent for non-clickable rows. */
  onItemClick?: (item: T, index: number) => void
  /** The row's item. */
  item: T
  /** The row's index. */
  index: number
}

/**
 * Svelte action keeping a row's click handler in sync with the caller's prop.
 *
 * @param node - The `<li>` the handler belongs to.
 * @param params - The current handler and the row's item and index.
 * @returns The action with an update that re-targets the same listener.
 */
export function rowClick<T>(
  node: HTMLElement,
  params: RowClick<T>,
): { update: (next: RowClick<T>) => void; destroy: () => void } {
  let current = params
  const listener = (): void => current.onItemClick?.(current.item, current.index)
  node.addEventListener('click', listener)
  return {
    update(next: RowClick<T>): void {
      current = next
    },
    destroy(): void {
      node.removeEventListener('click', listener)
    },
  }
}
