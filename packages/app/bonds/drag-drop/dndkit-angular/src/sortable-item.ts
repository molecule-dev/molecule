/**
 * The row directives of the Angular sortable list.
 *
 * @module
 */

import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  type OnDestroy,
  type OnInit,
  signal,
} from '@angular/core'

import { SortableItemController } from './sortable-item-controller.js'
import { SORTABLE_LIST } from './sortable-list-context.js'

/**
 * One row of a `[molSortableList]`. Its host element is the row dnd-kit makes
 * focusable and annotates, so the directive needs no template of its own:
 *
 * ```html
 * <li molSortableItem [molSortableItem]="task.id">{{ task.title }}</li>
 * ```
 *
 * `exportAs: 'molSortableItem'` exposes `isDragging` and `isDropTarget` to the
 * template.
 */
@Directive({
  selector: '[molSortableItem]',
  standalone: true,
  exportAs: 'molSortableItem',
})
export class SortableItem implements OnInit, OnDestroy {
  /** The id of one of the list's `items`. */
  readonly molSortableItem = input.required<string>()
  /** Data carried with the drag, reported on the drag events. */
  readonly data = input<Record<string, unknown>>()
  /** Disables dragging this item. Defaults to `false`. */
  readonly disabled = input(false)
  /** `true` while this row is being dragged. */
  readonly isDragging = signal(false)
  /** `true` while another dragged row is over this one. */
  readonly isDropTarget = signal(false)

  private readonly list = inject(SORTABLE_LIST, { optional: true })
  private readonly element = inject<ElementRef<Element>>(ElementRef)
  private controller?: SortableItemController

  /**
   * Keeps the row's index, disabled flag and data in step with the list as its
   * `items` change and the list is disabled or enabled.
   */
  constructor() {
    effect(() => {
      const id = this.molSortableItem()
      const disabled = this.disabled()
      const listDisabled = this.list?.disabled() ?? false
      const index = this.list?.indexOf(id) ?? -1
      const data = this.data()
      const controller = this.controller
      if (!controller) return
      controller.setId(id)
      controller.setIndex(index)
      controller.setDisabled(disabled || listDisabled)
      controller.setData(data)
    })
  }

  /**
   * Registers the row with the list's manager, on the host element.
   *
   * @throws {Error} When the row is not inside a `[molSortableList]`.
   */
  ngOnInit(): void {
    const list = this.list
    if (!list) throw new Error('molSortableItem must be used inside a [molSortableList].')
    this.controller = new SortableItemController({
      manager: list.manager,
      list,
      options: {
        id: this.molSortableItem(),
        data: this.data(),
        disabled: this.disabled() || list.disabled(),
      },
      element: this.element.nativeElement,
      isDragging: this.isDragging,
      isDropTarget: this.isDropTarget,
    })
  }

  /**
   * Attaches or clears the element that starts a drag for this row.
   *
   * @param handle - The handle's element, or `undefined` to drag by the whole row.
   */
  setHandle(handle: Element | undefined): void {
    this.controller?.setHandle(handle)
  }

  /** Unregisters the row from the list's manager. */
  ngOnDestroy(): void {
    this.controller?.destroy()
  }
}

/**
 * Marks an element inside a `[molSortableItem]` as its drag handle: only that
 * element starts a drag, while the rest of the row stays inert.
 */
@Directive({
  selector: '[molSortableItemHandle]',
  standalone: true,
})
export class SortableItemHandle implements OnInit, OnDestroy {
  private readonly item = inject(SortableItem, { optional: true })
  private readonly element = inject<ElementRef<Element>>(ElementRef)

  /**
   * Attaches this element as the row's drag handle.
   *
   * @throws {Error} When the handle is not inside a `[molSortableItem]`.
   */
  ngOnInit(): void {
    if (!this.item)
      throw new Error('molSortableItemHandle must be used inside a [molSortableItem].')
    this.item.setHandle(this.element.nativeElement)
  }

  /** Detaches the handle from the row. */
  ngOnDestroy(): void {
    this.item?.setHandle(undefined)
  }
}
