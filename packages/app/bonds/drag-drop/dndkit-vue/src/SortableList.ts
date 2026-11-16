/**
 * The Vue sortable list.
 *
 * @module
 */

import { DragDropProvider } from '@dnd-kit/vue'
import { computed, defineComponent, h, provide, type VNode } from 'vue'

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@molecule/app-drag-drop'
import type { SortableListOptions } from '@molecule/app-drag-drop-dndkit'
import {
  coreDragOver,
  coreDragStart,
  resolveSortableAxis,
  sortableListDrop,
  sortableListModifiers,
  sortableListPlugins,
  sortableListSensors,
} from '@molecule/app-drag-drop-dndkit'

import type { SortableListState } from './context.js'
import { sortableListKey } from './context.js'

/**
 * Props for {@link SortableList}: the options every framework's list takes,
 * plus the rendered list as the default slot.
 *
 * The callbacks are declared in method form on purpose. A Vue component is not
 * generic, so this list is typed over `{ id: string }`; method parameters
 * compare bivariantly, which lets a list of your own item type pass its own
 * `onReorder(items: Task[])`, `getItemLabel(item: Task)` and drag listeners.
 *
 * @template T - The item type. Items must have a stable string `id`.
 */
export interface SortableListProps<T extends { id: string }> extends Omit<
  SortableListOptions<T>,
  'onReorder' | 'getItemLabel' | 'onDragStart' | 'onDragOver' | 'onDragEnd'
> {
  /**
   * Called with the whole list in its new order when a drop moves an item. Not
   * called when the drag is cancelled, the list is disabled, or the item is
   * dropped where it started.
   *
   * @param items - The reordered items.
   */
  onReorder(items: T[]): void
  /**
   * The name a screen reader hears for an item in the drag announcements.
   * Defaults to the item's `id`.
   *
   * @param item - The item.
   * @returns Its label.
   */
  getItemLabel?(item: T): string
  /**
   * Called when a drag starts.
   *
   * @param event - The core drag-start event.
   */
  onDragStart?(event: DragStartEvent): void
  /**
   * Called while a dragged item is over another item.
   *
   * @param event - The core drag-over event.
   */
  onDragOver?(event: DragOverEvent): void
  /**
   * Called when a drag ends, before `onReorder`. `overId` is the item whose
   * place it took.
   *
   * @param event - The core drag-end event.
   */
  onDragEnd?(event: DragEndEvent): void
}

/** The props {@link SortableList} declares to Vue at runtime. */
const runtimeProps: (keyof SortableListProps<{ id: string }>)[] = [
  'items',
  'onReorder',
  'axis',
  'strategy',
  'disabled',
  'config',
  'getItemLabel',
  'onDragStart',
  'onDragOver',
  'onDragEnd',
]

/**
 * A list the user reorders with the pointer, touch or the keyboard (Space or
 * Enter to pick an item up, the arrow keys to move it, Space or Enter to drop
 * it, Escape to cancel). A screen reader hears translated instructions and
 * where the item is as it moves. A drop that moves an item calls `onReorder`
 * with the new order; render `items` from your state.
 *
 * The rows come from the default slot; each one calls {@link useSortableItem}.
 *
 * @param props - {@link SortableListProps}.
 * @param context - The setup context, whose default slot renders the rows.
 * @returns The list's render function.
 */
export const SortableList = defineComponent(
  (props: SortableListProps<{ id: string }>, { slots }) => {
    const state: SortableListState = {
      indexOf: (id) => props.items.findIndex((item) => item.id === id),
      get disabled() {
        return props.disabled ?? false
      },
    }
    provide(sortableListKey, state)

    const sensors = computed(() =>
      sortableListSensors({
        activationDelay: props.config?.activationDelay,
        activationDistance: props.config?.activationDistance,
        cancelOnEscape: props.config?.cancelOnEscape,
      }),
    )
    const axis = computed(() => resolveSortableAxis(props.axis, props.strategy))
    const modifiers = computed(() => sortableListModifiers(axis.value))
    const plugins = sortableListPlugins({
      labelOf: (id) => {
        const item = props.items.find((candidate) => candidate.id === id)
        return item && props.getItemLabel ? props.getItemLabel(item) : id
      },
      count: () => props.items.length,
    })

    return (): VNode =>
      h(
        DragDropProvider,
        {
          sensors: sensors.value,
          modifiers: modifiers.value,
          plugins,
          onDragStart: (event) => {
            const started = coreDragStart(event.operation.source)
            if (started) props.onDragStart?.(started)
          },
          onDragOver: (event) => {
            const over = coreDragOver(event.operation.source, event.operation.target)
            if (over) props.onDragOver?.(over)
          },
          onDragEnd: (event) => {
            const drop = sortableListDrop(props.items, event, props.disabled ?? false)
            if (drop.event) props.onDragEnd?.(drop.event)
            if (drop.reordered) props.onReorder(drop.reordered)
          },
        },
        { default: () => slots.default?.() },
      )
  },
  { name: 'SortableList', props: runtimeProps },
)
