/**
 * The context a Svelte `SortableList` gives its items.
 *
 * @module
 */

/** What a sortable item reads from the list around it. */
export interface SortableListState {
  /**
   * The item's index in the list's current `items`.
   *
   * @param id - The item's id.
   * @returns Its index, or `-1` when the list has no such item.
   */
  indexOf: (id: string) => number
  /** Whether the whole list is disabled. */
  disabled: boolean
}

/**
 * The context key for {@link SortableListState}: set by `SortableList`, and
 * absent outside one, where `useSortableItem` refuses to run.
 */
export const SORTABLE_LIST_CONTEXT = Symbol('molecule-sortable-list')
