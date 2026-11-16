/**
 * The React sortable list.
 *
 * @module
 */

import { DragDropProvider } from '@dnd-kit/react'
import type { JSX, ReactNode } from 'react'
import { useLayoutEffect, useMemo, useRef } from 'react'

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
  /** The rendered list, whose rows call {@link useSortableItem}. */
  children: ReactNode
}

/**
 * A list the user reorders with the pointer, touch or the keyboard (Space or
 * Enter to pick an item up, the arrow keys to move it, Space or Enter to drop
 * it, Escape to cancel). A screen reader hears translated instructions and
 * where the item is as it moves. A drop that moves an item calls `onReorder`
 * with the new order; render `items` from your state.
 *
 * @template T - The item type.
 * @param props - {@link SortableListProps}.
 * @returns The list.
 */
export function SortableList<T extends { id: string }>(props: SortableListProps<T>): JSX.Element {
  const { items, axis, strategy, disabled = false, config, children } = props
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  const { activationDelay, activationDistance, cancelOnEscape } = config ?? {}
  const sensors = useMemo(
    () => sortableListSensors({ activationDelay, activationDistance, cancelOnEscape }),
    [activationDelay, activationDistance, cancelOnEscape],
  )
  const resolvedAxis = resolveSortableAxis(axis, strategy)
  const modifiers = useMemo(() => sortableListModifiers(resolvedAxis), [resolvedAxis])
  const plugins = useMemo(
    () =>
      sortableListPlugins({
        labelOf: (id) => {
          const { items: current, getItemLabel } = latest.current
          const item = current.find((candidate) => candidate.id === id)
          return item && getItemLabel ? getItemLabel(item) : id
        },
        count: () => latest.current.items.length,
      }),
    [],
  )
  const state = useMemo<SortableListState>(
    () => ({ indexOf: (id) => items.findIndex((item) => item.id === id), disabled }),
    [items, disabled],
  )

  return (
    <SortableListContext.Provider value={state}>
      <DragDropProvider
        sensors={sensors}
        modifiers={modifiers}
        plugins={plugins}
        onDragStart={(event) => {
          const started = coreDragStart(event.operation.source)
          if (started) latest.current.onDragStart?.(started)
        }}
        onDragOver={(event) => {
          const over = coreDragOver(event.operation.source, event.operation.target)
          if (over) latest.current.onDragOver?.(over)
        }}
        onDragEnd={(event) => {
          const { items: current, disabled: off = false, onReorder, onDragEnd } = latest.current
          const drop = sortableListDrop(current, event, off)
          if (drop.event) onDragEnd?.(drop.event)
          if (drop.reordered) onReorder(drop.reordered)
        }}
      >
        {children}
      </DragDropProvider>
    </SortableListContext.Provider>
  )
}
