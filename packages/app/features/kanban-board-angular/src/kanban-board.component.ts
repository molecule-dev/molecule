/**
 * KanbanBoard component (React parity).
 *
 * @module
 */

import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { KanbanColumn } from './kanban-column.component.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'

/**
 * Kanban board with HTML5 drag-drop between columns.
 *
 * The Angular counterpart of `@molecule/app-kanban-board-react`'s
 * `KanbanBoard`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input. The host IS the board `<div>`
 * (`div[mol-kanban-board]`), matching React's root exactly, with one wrapper
 * div per column holding a `section[mol-kanban-column]`.
 *
 * The drag payload is the same JSON React writes under `text/molecule-kanban`:
 * `{ cardId, fromColumnId }`. A drop on the source column is ignored, and a
 * malformed payload cancels the drop without a callback.
 */
@Component({
  selector: 'div[mol-kanban-board]',
  standalone: true,
  imports: [KanbanColumn],
  inputs: [
    'columns',
    'onCardMove',
    'onCardClick',
    'renderHeaderActions',
    'renderFooter',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@for (column of columns; track column.id) {<div [class]="columnWrapperClasses()"><section mol-kanban-column [column]="column" [onCardClick]="onCardClick" [onDrop]="dropHandlerFor()" [onCardDragStart]="cardDragHandler" [headerActions]="renderHeaderActions" [footer]="renderFooter"></section></div>}`,
})
export class KanbanBoard {
  /** Columns to render, left to right. */
  columns: KanbanColumnData[] = []
  /** Called when a card moves from one column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Optional per-column header action template (context: `a0` = column). */
  renderHeaderActions?: TemplateRef<unknown>
  /** Optional per-column footer template (context: `a0` = column). */
  renderFooter?: TemplateRef<unknown>
  /** Extra classes on the outer board wrapper. */
  className?: string

  /**
   * The drop handler handed to each column — React's `(column, e) => onDrop(…)`.
   *
   * @param column - The column dropped on.
   * @param event - The drop event.
   */
  readonly dropHandler = (column: KanbanColumnData, event: DragEvent): void => {
    this.onDrop(column, event)
  }

  /**
   * The drop handler the columns receive — present only when `onCardMove` is
   * supplied, matching React's `onDrop={onCardMove ? onDrop : undefined}`.
   *
   * @returns The drop handler, or undefined.
   */
  dropHandlerFor(): ((column: KanbanColumnData, event: DragEvent) => void) | undefined {
    return this.onCardMove ? this.dropHandler : undefined
  }

  /**
   * The card drag-start handler handed to each column.
   *
   * @param card - The dragged card.
   * @param column - The column it started from.
   * @param event - The drag start event.
   */
  readonly cardDragHandler = (
    card: KanbanCardData,
    column: KanbanColumnData,
    event: DragEvent,
  ): void => {
    this.onCardDragStart(card, column, event)
  }

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The board's class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'start', gap: 'md' }), this.className)
  }

  /**
   * The per-column wrapper's class list (`cm.flex1`).
   *
   * @returns The class string.
   */
  columnWrapperClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * Stores the card identity in the drag payload so the drop handler knows the
   * source column (the same JSON React writes).
   *
   * @param card - The dragged card.
   * @param column - The column it started from.
   * @param event - The drag start event.
   */
  onCardDragStart(card: KanbanCardData, column: KanbanColumnData, event: DragEvent): void {
    event.dataTransfer?.setData(
      'text/molecule-kanban',
      JSON.stringify({ cardId: card.id, fromColumnId: column.id }),
    )
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Handles a card drop onto a column, parsing the drag payload and invoking
   * `onCardMove` when the card came from a different column.
   *
   * @param column - The column dropped on.
   * @param event - The drop event.
   */
  onDrop(column: KanbanColumnData, event: DragEvent): void {
    event.preventDefault()
    const payload = event.dataTransfer?.getData('text/molecule-kanban')
    if (!payload || !this.onCardMove) return
    try {
      const { cardId, fromColumnId } = JSON.parse(payload) as {
        cardId: string
        fromColumnId: string
      }
      if (fromColumnId !== column.id) this.onCardMove(cardId, fromColumnId, column.id)
    } catch (_error) {
      // Safe to ignore: the dataTransfer payload is untrusted/malformed, so the drop is cancelled.
    }
  }
}
