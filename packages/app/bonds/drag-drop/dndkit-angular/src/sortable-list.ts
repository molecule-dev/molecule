/**
 * The Angular sortable list.
 *
 * @module
 */

import { Directive, effect, forwardRef, input, type OnDestroy } from '@angular/core'
import { DragDropManager } from '@dnd-kit/dom'

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  SortableAxis,
  SortableStrategy,
} from '@molecule/app-drag-drop'
import type { DndKitConfig, SortableListOptions } from '@molecule/app-drag-drop-dndkit'
import {
  coreDragOver,
  coreDragStart,
  resolveSortableAxis,
  sortableListDrop,
  sortableListModifiers,
  sortableListPlugins,
  sortableListSensors,
} from '@molecule/app-drag-drop-dndkit'

import { SORTABLE_LIST, type SortableListHost } from './sortable-list-context.js'

/**
 * The inputs of {@link SortableList} (`[molSortableList]`): the options every
 * framework's list takes. Its rows are the element's content.
 *
 * @template T - The item type. Items must have a stable string `id`.
 */
export type SortableListProps<T extends { id: string }> = SortableListOptions<T>

/**
 * A list the user reorders with the pointer, touch or the keyboard (Space or
 * Enter to pick an item up, the arrow keys to move it, Space or Enter to drop
 * it, Escape to cancel). A screen reader hears translated instructions and
 * where the item is as it moves. A drop that moves an item calls `onReorder`
 * with the new order; render `items` from your state.
 *
 * The callbacks are inputs, not outputs, so a consumer passes the same
 * functions a React list takes (`[onReorder]="save"`). Each row carries
 * {@link SortableItem} (`[molSortableItem]`, or `useSortableItem` in a
 * component's field initializer).
 *
 * @template T - The item type. Items must have a stable string `id`.
 */
@Directive({
  selector: '[molSortableList]',
  standalone: true,
  providers: [{ provide: SORTABLE_LIST, useExisting: forwardRef(() => SortableList) }],
})
export class SortableList<T extends { id: string } = { id: string }>
  implements SortableListHost, OnDestroy
{
  /** The items, in their current order. */
  readonly items = input<T[]>([])
  /**
   * Called with the whole list in its new order when a drop moves an item. Not
   * called when the drag is cancelled, the list is disabled, or the item is
   * dropped where it started. Persist the order here; the list renders `items`.
   */
  readonly onReorder = input.required<(items: T[]) => void>()
  /** The axis an item may move along. Defaults to `strategy`'s axis, else `'vertical'`. */
  readonly axis = input<SortableAxis>()
  /** The layout: `'grid'` lets items move in any direction. Used when `axis` is absent. */
  readonly strategy = input<SortableStrategy>()
  /** Disables dragging every item. Defaults to `false`. */
  readonly disabled = input(false)
  /** Pointer activation thresholds and the Escape behavior. */
  readonly config = input<DndKitConfig>()
  /**
   * The name a screen reader hears for an item in the drag announcements
   * ("Picked up {label}, position 2 of 5."). Defaults to the item's `id`.
   */
  readonly getItemLabel = input<(item: T) => string>()
  /** Called when a drag starts. */
  readonly onDragStart = input<(event: DragStartEvent) => void>()
  /** Called while a dragged item is over another item. */
  readonly onDragOver = input<(event: DragOverEvent) => void>()
  /** Called when a drag ends, before `onReorder`. `overId` is the item whose place it took. */
  readonly onDragEnd = input<(event: DragEndEvent) => void>()

  /** The dnd-kit manager this list owns. */
  readonly manager: DragDropManager

  /**
   * Creates the list's manager with the shared sensors, modifiers and
   * translated plugins, and reports the manager's drag events to the inputs.
   */
  constructor() {
    this.manager = new DragDropManager({
      plugins: sortableListPlugins({
        labelOf: (id) => {
          const item = this.items().find((candidate) => candidate.id === id)
          const getItemLabel = this.getItemLabel()
          return item && getItemLabel ? getItemLabel(item) : id
        },
        count: () => this.items().length,
      }),
    })
    this.manager.monitor.addEventListener('dragstart', ({ operation }) => {
      const started = coreDragStart(operation.source)
      if (started) this.onDragStart()?.(started)
    })
    this.manager.monitor.addEventListener('dragover', ({ operation }) => {
      const over = coreDragOver(operation.source, operation.target)
      if (over) this.onDragOver()?.(over)
    })
    this.manager.monitor.addEventListener('dragend', (event) => {
      const drop = sortableListDrop(this.items(), event, this.disabled())
      if (drop.event) this.onDragEnd()?.(drop.event)
      if (drop.reordered) this.onReorder()(drop.reordered)
    })
    // Inputs are bound after the constructor, so the sensors and modifiers are
    // rebuilt here, once their inputs are available, the way React's memos do.
    effect(() => {
      const { activationDelay, activationDistance, cancelOnEscape } = this.config() ?? {}
      const sensors = sortableListSensors({
        activationDelay,
        activationDistance,
        cancelOnEscape,
      })
      // The shared helper is typed as a list or a function of the defaults; it returns a list.
      if (Array.isArray(sensors)) this.manager.sensors = sensors
    })
    effect(() => {
      const modifiers = sortableListModifiers(resolveSortableAxis(this.axis(), this.strategy()))
      if (Array.isArray(modifiers)) this.manager.modifiers = modifiers
    })
  }

  /**
   * The item's index in the list's current `items`.
   *
   * @param id - The item's id.
   * @returns Its index, or `-1` when the list has no such item.
   */
  indexOf(id: string): number {
    return this.items().findIndex((item) => item.id === id)
  }

  /** Destroys the manager, which removes the instructions and the live region. */
  ngOnDestroy(): void {
    this.manager.destroy()
  }
}
