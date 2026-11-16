/**
 * The Vue composable for one row of a sortable list.
 *
 * @module
 */

import { useSortable } from '@dnd-kit/vue/sortable'
import { inject, type Ref, shallowRef } from 'vue'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import { sortableListKey } from './context.js'

/** What {@link useSortableItem} returns for one row. */
export interface SortableItemState {
  /**
   * Attach to the row's element, as a template ref. dnd-kit makes it
   * focusable and sets its `role`, `aria-roledescription`, `aria-describedby`,
   * `aria-pressed` and `aria-disabled`.
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
  isDragging: Readonly<Ref<boolean>>
  /** `true` while another dragged row is over this one. */
  isDropTarget: Readonly<Ref<boolean>>
}

/**
 * Makes one row of a {@link SortableList} draggable. Call it in the row's
 * component, inside the list, and attach `ref` to the row's element.
 *
 * @param options - The row's item id, drag data and disabled flag.
 * @returns The refs to attach and the row's drag state.
 */
export function useSortableItem(options: SortableItemOptions): SortableItemState {
  const list = inject(sortableListKey)
  if (!list) throw new Error('useSortableItem must be called inside a <SortableList>.')
  const { id, data, disabled = false } = options
  const element = shallowRef<HTMLElement | null>(null)
  const handle = shallowRef<HTMLElement | null>(null)
  const { isDragging, isDropTarget } = useSortable({
    id,
    index: () => list.indexOf(id),
    data,
    disabled: () => disabled || list.disabled,
    element,
    handle,
  })
  return {
    ref: (node) => {
      element.value = node instanceof HTMLElement ? node : null
    },
    handleRef: (node) => {
      handle.value = node instanceof HTMLElement ? node : null
    },
    isDragging,
    isDropTarget,
  }
}
