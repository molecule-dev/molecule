/**
 * The context a `SortableList` gives its items.
 *
 * @module
 */

import { createContext } from 'solid-js'

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

/** Set by `SortableList`; `undefined` outside one. */
export const SortableListContext = createContext<SortableListState | undefined>()
