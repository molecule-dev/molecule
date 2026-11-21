/**
 * Types for the Vue drag-handle reorder list.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** A single item in a {@link ReorderableList}, pairing a stable string id with arbitrary data. */
export interface ReorderableItem<T> {
  /** The item's stable identity — drop resolution matches by it. */
  id: string
  /** The item's data, handed to the renderer untouched. */
  data: T
}

/** Props accepted by the {@link ReorderableList} component. */
export interface ReorderableListProps<T> {
  /** Items in display order. */
  items: readonly ReorderableItem<T>[]
  /** Called with the new order (full list). */
  onReorder: (next: ReorderableItem<T>[]) => void
  /** Per-item renderer. Receives item + isDragging flag. */
  renderItem: (item: ReorderableItem<T>, isDragging: boolean) => VNodeChild
  /** Optional drag-handle slot — when omitted, the entire row is the drag target. */
  renderHandle?: () => VNodeChild
  /** Extra classes on the list. */
  className?: string
}
