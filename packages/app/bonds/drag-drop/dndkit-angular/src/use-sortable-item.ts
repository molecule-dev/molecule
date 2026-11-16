/**
 * The injection-context function form of one row of an Angular sortable list.
 *
 * @module
 */

import { DestroyRef, effect, inject, type Signal } from '@angular/core'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import { SortableItemController } from './sortable-item-controller.js'
import { SORTABLE_LIST } from './sortable-list-context.js'

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
  isDragging: Signal<boolean>
  /** `true` while another dragged row is over this one. */
  isDropTarget: Signal<boolean>
}

/**
 * Makes one row of a `[molSortableList]` draggable. Call it in a component's
 * field initializer (or constructor) inside the list, then attach `ref` to the
 * row's element:
 *
 * ```typescript
 * readonly row = useSortableItem({ id: 'a' })
 * ```
 *
 * The list's current order and disabled flag are read through signals, so the
 * row follows them as the list changes without being remounted.
 *
 * @param options - The row's item id, drag data and disabled flag.
 * @returns The refs to attach and the row's drag state.
 * @throws {Error} When called outside a `[molSortableList]`, since the row has
 * no list to register with.
 */
export function useSortableItem(options: SortableItemOptions): SortableItemState {
  const list = inject(SORTABLE_LIST, { optional: true })
  if (!list) throw new Error('useSortableItem must be called inside a [molSortableList].')
  const controller = new SortableItemController({
    manager: list.manager,
    list,
    options,
  })
  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(() => controller.destroy())
  effect(() => {
    controller.setId(options.id)
    controller.setIndex(list.indexOf(options.id))
    controller.setDisabled((options.disabled ?? false) || list.disabled())
    controller.setData(options.data)
  })
  return {
    ref: (element) => controller.setElement(element ?? undefined),
    handleRef: (element) => controller.setHandle(element ?? undefined),
    isDragging: controller.isDragging.asReadonly(),
    isDropTarget: controller.isDropTarget.asReadonly(),
  }
}
