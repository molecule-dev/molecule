/**
 * Types for the Svelte drag-handle reorder list.
 *
 * @module
 */

import type { Snippet } from 'svelte'

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
  /** Per-item renderer snippet. Receives `(item, isDragging)` — React's `renderItem`. */
  renderItem: Snippet<[ReorderableItem<T>, boolean]>
  /** Optional drag-handle snippet — when omitted, the entire row is the drag target. */
  renderHandle?: Snippet
  /** Extra classes on the list. */
  className?: string
}
