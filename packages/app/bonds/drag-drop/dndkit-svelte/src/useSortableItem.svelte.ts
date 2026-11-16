/**
 * The Svelte composable for one row of a sortable list.
 *
 * @module
 */

import { createSortable } from '@dnd-kit/svelte/sortable'
import { getContext } from 'svelte'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import type { SortableListState } from './context.js'
import { SORTABLE_LIST_CONTEXT } from './context.js'

/** What {@link useSortableItem} returns for one row. */
export interface SortableItemState {
  /**
   * A Svelte attachment for the row's element: Svelte calls it with the
   * element when the row mounts, and with the returned cleanup when it is
   * removed. dnd-kit makes the element focusable and sets its `role`,
   * `aria-roledescription`, `aria-describedby`, `aria-pressed` and
   * `aria-disabled`.
   *
   * @param node - The row's element.
   * @returns The detach function Svelte calls when the row is removed.
   */
  ref: (node: HTMLElement) => () => void
  /**
   * A Svelte attachment for a drag handle inside the row (the library's
   * `attachHandle`) so only the handle starts a drag; leave it unused to drag
   * by the whole row.
   *
   * @param node - The handle's element.
   * @returns The detach function Svelte calls when the handle is removed.
   */
  handleRef: (node: HTMLElement) => () => void
  /** `true` while this row is being dragged. */
  readonly isDragging: boolean
  /** `true` while another dragged row is over this one. */
  readonly isDropTarget: boolean
}

/**
 * Makes one row of a `SortableList` draggable. Call it during the row
 * component's initialization, inside the list.
 *
 * @param options - The row's item id, drag data and disabled flag.
 * @returns The attachments to apply to the row (and its handle) plus its drag state.
 * @throws {Error} When called outside a `SortableList`.
 */
export function useSortableItem(options: SortableItemOptions): SortableItemState {
  const list = getContext<SortableListState | undefined>(SORTABLE_LIST_CONTEXT)
  if (!list) throw new Error('useSortableItem must be called inside a <SortableList>.')
  const { id, data, disabled = false } = options
  // Getters, so dnd-kit reads the row's index and the list's disabled flag
  // reactively: a reorder or a disabled change reaches the sortable instance.
  const sortable = createSortable({
    id,
    get index() {
      return list.indexOf(id)
    },
    data,
    get disabled() {
      return disabled || list.disabled
    },
  })
  return {
    ref: sortable.attach,
    handleRef: sortable.attachHandle,
    get isDragging() {
      return sortable.isDragging
    },
    get isDropTarget() {
      return sortable.isDropTarget
    },
  }
}
