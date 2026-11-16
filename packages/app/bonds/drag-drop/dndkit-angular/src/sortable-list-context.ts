/**
 * The context a sortable list gives its rows.
 *
 * @module
 */

import { InjectionToken, type Signal } from '@angular/core'
import type { DragDropManager } from '@dnd-kit/dom'

/** What an item reads from the sortable list around it. */
export interface SortableListHost {
  /** The dnd-kit manager the list owns. */
  readonly manager: DragDropManager
  /** Whether the whole list is disabled. */
  readonly disabled: Signal<boolean>
  /**
   * The item's index in the list's current `items`.
   *
   * @param id - The item's id.
   * @returns Its index, or `-1` when the list has no such item.
   */
  indexOf(id: string): number
}

/** Set by the list directive; absent outside one. */
export const SORTABLE_LIST = new InjectionToken<SortableListHost>('SORTABLE_LIST')
