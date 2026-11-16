/**
 * The React hook for one row of a sortable list.
 *
 * @module
 */

import { useSortable } from '@dnd-kit/react/sortable'
import { useContext } from 'react'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import { SortableListContext } from './context.js'

/** What {@link useSortableItem} returns for one row. */
export interface SortableItemState {
  /**
   * Attach to the row's element. dnd-kit makes it focusable and sets its
   * `role`, `aria-roledescription`, `aria-describedby`, `aria-pressed` and
   * `aria-disabled`.
   *
   * @param element - The row's element, or `null` on unmount.
   */
  ref: (element: Element | null) => void
  /**
   * Attach to a drag handle inside the row so only the handle starts a drag;
   * leave it unused to drag by the whole row.
   *
   * @param element - The handle's element, or `null` on unmount.
   */
  handleRef: (element: Element | null) => void
  /** `true` while this row is being dragged. */
  isDragging: boolean
  /** `true` while another dragged row is over this one. */
  isDropTarget: boolean
}

/**
 * Makes one row of a {@link SortableList} draggable. Call it in the row's
 * component, inside the list.
 *
 * @param options - The row's item id, drag data and disabled flag.
 * @returns The refs to attach and the row's drag state.
 */
export function useSortableItem(options: SortableItemOptions): SortableItemState {
  const list = useContext(SortableListContext)
  if (!list) throw new Error('useSortableItem must be called inside a <SortableList>.')
  const { id, data, disabled = false } = options
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id,
    index: list.indexOf(id),
    data,
    disabled: disabled || list.disabled,
  })
  return { ref, handleRef, isDragging, isDropTarget }
}
