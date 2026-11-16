/**
 * The props of the Svelte sortable list.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { SortableListOptions } from '@molecule/app-drag-drop-dndkit'

/**
 * Props for `SortableList`: the options every framework's list takes, plus the
 * list itself as `children`.
 *
 * @template T - The item type. Items must have a stable string `id`.
 */
export interface SortableListProps<T extends { id: string }> extends SortableListOptions<T> {
  /** The rendered list, whose rows call `useSortableItem`. */
  children: Snippet
}
