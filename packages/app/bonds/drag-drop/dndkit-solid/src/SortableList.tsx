/**
 * The Solid sortable list.
 *
 * @module
 */

import { DragDropProvider } from '@dnd-kit/solid'
import type { JSX } from 'solid-js'
import { createMemo } from 'solid-js'

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
import { SortableListContext } from './context.js'

/**
 * Props for {@link SortableList}: the options every framework's list takes,
 * plus the list itself as `children`.
 *
 * @template T - The item type. Items must have a stable string `id`.
 */
export interface SortableListProps<T extends { id: string }> extends SortableListOptions<T> {
  /** The rendered list, whose rows call `useSortableItem`. */
  children: JSX.Element
}

/**
 * A list the user reorders with the pointer, touch or the keyboard (Space or
 * Enter to pick an item up, the arrow keys to move it, Space or Enter to drop
 * it, Escape to cancel). A screen reader hears translated instructions and
 * where the item is as it moves. A drop that moves an item calls `onReorder`
 * with the new order; render `items` from your state.
 *
 * Props are read lazily, so the drag callbacks see the list as it is when the
 * event fires.
 *
 * @template T - The item type.
 * @param props - {@link SortableListProps}.
 * @returns The list.
 */
export function SortableList<T extends { id: string }>(props: SortableListProps<T>): JSX.Element {
  const sensors = createMemo(() => {
    const { activationDelay, activationDistance, cancelOnEscape } = props.config ?? {}
    return sortableListSensors({ activationDelay, activationDistance, cancelOnEscape })
  })
  const modifiers = createMemo(() =>
    sortableListModifiers(resolveSortableAxis(props.axis, props.strategy)),
  )
  const plugins = createMemo(() =>
    sortableListPlugins({
      labelOf: (id) => {
        const item = props.items.find((candidate) => candidate.id === id)
        return item && props.getItemLabel ? props.getItemLabel(item) : id
      },
      count: () => props.items.length,
    }),
  )
  const state: SortableListState = {
    // Read through getters so a row follows the list's current order and
    // disabled flag without being remounted.
    indexOf: (id) => props.items.findIndex((item) => item.id === id),
    get disabled() {
      return props.disabled ?? false
    },
  }

  return (
    <SortableListContext.Provider value={state}>
      <DragDropProvider
        sensors={sensors()}
        modifiers={modifiers()}
        plugins={plugins()}
        onDragStart={(event) => {
          const started = coreDragStart(event.operation.source)
          if (started) props.onDragStart?.(started)
        }}
        onDragOver={(event) => {
          const over = coreDragOver(event.operation.source, event.operation.target)
          if (over) props.onDragOver?.(over)
        }}
        onDragEnd={(event) => {
          const drop = sortableListDrop(props.items, event, props.disabled ?? false)
          if (drop.event) props.onDragEnd?.(drop.event)
          if (drop.reordered) props.onReorder(drop.reordered)
        }}
      >
        {props.children}
      </DragDropProvider>
    </SortableListContext.Provider>
  )
}
