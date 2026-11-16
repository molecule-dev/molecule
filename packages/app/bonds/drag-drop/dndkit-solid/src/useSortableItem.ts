/**
 * The Solid primitive for one row of a sortable list.
 *
 * @module
 */

import { useSortable } from '@dnd-kit/solid/sortable'
import type { Accessor } from 'solid-js'
import { useContext } from 'solid-js'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import { SortableListContext } from './context.js'

/** What {@link useSortableItem} returns for one row. */
export interface SortableItemState {
  /**
   * Attach to the row's element. dnd-kit makes it focusable and sets its
   * `role`, `aria-roledescription`, `aria-describedby`, `aria-pressed` and
   * `aria-disabled`.
   *
   * @param element - The row's element.
   */
  ref: (element: Element) => void
  /**
   * Attach to a drag handle inside the row so only the handle starts a drag;
   * leave it unused to drag by the whole row.
   *
   * @param element - The handle's element.
   */
  handleRef: (element: Element) => void
  /** `true` while this row is being dragged. */
  isDragging: Accessor<boolean>
  /** `true` while another dragged row is over this one. */
  isDropTarget: Accessor<boolean>
}

/**
 * Makes one row of a `SortableList` draggable. Call it in the row's component,
 * inside the list.
 *
 * @param options - The row's item id, drag data and disabled flag.
 * @returns The refs to attach and the row's drag state.
 * @throws {Error} When called outside a `SortableList`, since the row has no
 * list to register with.
 */
export function useSortableItem(options: SortableItemOptions): SortableItemState {
  const list = useContext(SortableListContext)
  if (!list) throw new Error('useSortableItem must be called inside a <SortableList>.')
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id: options.id,
    // Read as getters so dnd-kit follows the list as it reorders and disables,
    // the way React passes a new index and disabled flag on every render.
    get index() {
      return list.indexOf(options.id)
    },
    data: options.data,
    get disabled() {
      return (options.disabled ?? false) || list.disabled
    },
  })
  return {
    ref: (element: Element) => {
      ref(element)
    },
    handleRef: (element: Element) => {
      handleRef(element)
    },
    isDragging,
    isDropTarget,
  }
}
