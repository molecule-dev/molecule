/**
 * Types of `@molecule/app-reorderable-list-angular` — the Angular counterpart
 * of `@molecule/app-reorderable-list-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** A single item in a {@link ReorderableList}, pairing a stable string id with arbitrary data. */
export interface ReorderableItem<T> {
  /** The item's stable identity — drop resolution matches by it. */
  id: string
  /** The item's data, handed to the renderer untouched. */
  data: T
}

/**
 * Props accepted by {@link ReorderableList} — the same props
 * `@molecule/app-reorderable-list-react` accepts. The render functions
 * (`renderItem`, `renderHandle`) are `TemplateRef`s (an input cannot carry a
 * node): `renderItem`'s context exposes the item as `a0` and the drag flag as
 * `a1`, matching React's `(item, isDragging)` call.
 */
export interface ReorderableListProps<T> {
  /** Items in display order. */
  items: readonly ReorderableItem<T>[]
  /** Called with the new order (full list). */
  onReorder?: (next: ReorderableItem<T>[]) => void
  /** Per-item template. Its context has `a0` = item, `a1` = isDragging. */
  renderItem?: TemplateRef<unknown>
  /** Optional drag-handle template — when omitted, the entire row is the drag target. */
  renderHandle?: TemplateRef<unknown>
  /** Extra classes on the list. */
  className?: string
}
