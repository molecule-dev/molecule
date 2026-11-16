/**
 * The dnd-kit sortable behind one row, shared by the item directive and the
 * injection-context function.
 *
 * @module
 */

import { signal, type WritableSignal } from '@angular/core'
import type { DragDropManager } from '@dnd-kit/dom'
import { Sortable } from '@dnd-kit/dom/sortable'

import type { SortableItemOptions } from '@molecule/app-drag-drop-dndkit'

import type { SortableListHost } from './sortable-list-context.js'

/** What {@link SortableItemController} needs to register one row. */
export interface SortableItemControllerInput {
  /** The manager the list owns. */
  manager: DragDropManager
  /** The list the row belongs to. */
  list: SortableListHost
  /** The row's id, drag data and disabled flag. */
  options: SortableItemOptions
  /** The row's element, when it is already known. */
  element?: Element
  /** The signal the row's dragging state is written to (a fresh one when absent). */
  isDragging?: WritableSignal<boolean>
  /** The signal the row's drop-target state is written to (a fresh one when absent). */
  isDropTarget?: WritableSignal<boolean>
}

/**
 * One row's dnd-kit `Sortable`. It registers itself with the list's manager,
 * follows the drag through two signals (`isDragging`, `isDropTarget`) and lets
 * the caller keep its index, disabled flag, data, element and handle in step
 * with the list.
 */
export class SortableItemController {
  /** `true` while this row is being dragged. */
  readonly isDragging: WritableSignal<boolean>
  /** `true` while another dragged row is over this one. */
  readonly isDropTarget: WritableSignal<boolean>

  private readonly manager: DragDropManager
  private id: string
  private readonly sortable: Sortable<Record<string, unknown>>
  private readonly unbind: () => void
  private currentData: Record<string, unknown> | undefined

  /**
   * Creates the row and registers it with the list.
   *
   * @param input - The manager, the list, the row's options and its signals.
   */
  constructor(input: SortableItemControllerInput) {
    const { list, manager, options } = input
    this.manager = manager
    this.id = String(options.id)
    this.currentData = options.data
    this.isDragging = input.isDragging ?? signal(false)
    this.isDropTarget = input.isDropTarget ?? signal(false)
    this.sortable = new Sortable<Record<string, unknown>>(
      {
        id: options.id,
        index: list.indexOf(options.id),
        data: options.data,
        disabled: options.disabled ?? false,
        element: input.element,
      },
      manager,
    )
    const unbindDragging = manager.monitor.addEventListener('dragstart', ({ operation }) => {
      this.isDragging.set(operation.source ? String(operation.source.id) === this.id : false)
    })
    const unbindOver = manager.monitor.addEventListener('dragover', ({ operation }) => {
      const { source, target } = operation
      const overThisRow = target !== null && String(target.id) === this.id
      const draggedRow = source !== null && String(source.id) === this.id
      this.isDropTarget.set(overThisRow && !draggedRow)
    })
    const unbindEnd = manager.monitor.addEventListener('dragend', () => {
      this.isDragging.set(false)
      this.isDropTarget.set(false)
    })
    this.unbind = () => {
      unbindDragging()
      unbindOver()
      unbindEnd()
    }
  }

  /**
   * Sets the row's id, keeping it registered under the same key.
   *
   * @param id - The id of one of the list's `items`.
   */
  setId(id: string): void {
    if (id === this.id) return
    this.id = id
    this.sortable.id = id
  }

  /**
   * Sets the row's index in the list's current `items`.
   *
   * @param index - The row's index (or `-1` when the list has no such item).
   */
  setIndex(index: number): void {
    this.sortable.index = index
  }

  /**
   * Sets whether the row is disabled.
   *
   * @param disabled - Whether dragging this row is disabled.
   */
  setDisabled(disabled: boolean): void {
    this.sortable.disabled = disabled
  }

  /**
   * Sets the data carried with the drag, reported on the drag events.
   *
   * @param data - The data, or `undefined` for none.
   */
  setData(data: Record<string, unknown> | undefined): void {
    if (data === this.currentData) return
    this.currentData = data
    this.sortable.data = data ?? {}
  }

  /**
   * Attaches the row's element. A `null` ref during a live drag leaves the
   * attached element alone (the dragged row is briefly moved out of the DOM by
   * the drop animation), as the React binding does.
   *
   * @param element - The row's element, or `undefined` on unmount.
   */
  setElement(element: Element | undefined): void {
    if (!element && this.sortable.element?.isConnected && !this.manager.dragOperation.status.idle)
      return
    this.sortable.element = element
  }

  /**
   * Attaches an optional drag handle so only that element starts a drag.
   *
   * @param handle - The handle's element, or `undefined` on unmount.
   */
  setHandle(handle: Element | undefined): void {
    this.sortable.handle = handle
  }

  /** Unregisters the row and removes its drag listeners. */
  destroy(): void {
    this.unbind()
    this.sortable.destroy()
  }
}
