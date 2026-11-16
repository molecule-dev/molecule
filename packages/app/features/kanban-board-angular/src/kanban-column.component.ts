/**
 * KanbanColumn component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { KanbanCard } from './kanban-card.component.js'
import { KanbanColumnHeader } from './kanban-column-header.component.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'

/**
 * One Kanban column — header + card list + optional footer.
 *
 * The Angular counterpart of `@molecule/app-kanban-board-react`'s
 * `KanbanColumn`: the same props (React names) and the same DOM for the same
 * input. The host IS the `<section>` (`section[mol-kanban-column]`), matching
 * React's root exactly, and it carries the drag handlers — the drop handlers
 * only act when `onDrop` is supplied, exactly as React gates them.
 */
@Component({
  selector: 'section[mol-kanban-column]',
  standalone: true,
  imports: [KanbanCard, KanbanColumnHeader, NgTemplateOutlet],
  inputs: [
    'column',
    'onCardClick',
    'onDrop',
    'onCardDragStart',
    'headerActions',
    'footer',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '(dragover)': 'handleDragOver($event)',
    '(drop)': 'handleDrop($event)',
  },
  // prettier-ignore
  template: `<header mol-kanban-column-header [title]="columnTitle()" [count]="cardCount()" [actions]="headerActions" [actionsContext]="headerContext()"><ng-container ngProjectAs="[slot=actions]"><ng-content select="[slot=headerActions]"></ng-content></ng-container></header><div [class]="cardsClasses()">@for (card of cards(); track card.id) {<div mol-kanban-card [card]="card" [onClick]="cardClickFor()" [onDragStart]="cardDragFor()"></div>}</div>@if (footer) {<ng-container [ngTemplateOutlet]="footer" [ngTemplateOutletContext]="headerContext()"></ng-container>}<ng-content select="[slot=footer]"></ng-content>`,
})
export class KanbanColumn {
  /** The column to render. */
  column?: KanbanColumnData
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Called when a card is dragged into this column. */
  onDrop?: (column: KanbanColumnData, event: DragEvent) => void
  /** Called when a card drag-start fires. */
  onCardDragStart?: (card: KanbanCardData, column: KanbanColumnData, event: DragEvent) => void
  /** Optional header actions template (context: `a0` = column). */
  headerActions?: TemplateRef<unknown>
  /** Optional footer template (context: `a0` = column). */
  footer?: TemplateRef<unknown>
  /** Extra classes. */
  className?: string

  /**
   * The card click handler handed to each card — React's
   * `(card) => onCardClick(card, column)`.
   *
   * @param card - The clicked card.
   */
  readonly cardClickHandler = (card: KanbanCardData): void => {
    if (this.column) this.onCardClick?.(card, this.column)
  }

  /**
   * The card drag-start handler handed to each card — React's
   * `(card, e) => onCardDragStart(card, column, e)`.
   *
   * @param card - The dragged card.
   * @param event - The drag start event.
   */
  readonly cardDragHandler = (card: KanbanCardData, event: DragEvent): void => {
    if (this.column) this.onCardDragStart?.(card, this.column, event)
  }

  /**
   * The card click handler the cards receive — present only when `onCardClick`
   * is supplied, matching React's conditional prop.
   *
   * @returns The handler, or undefined.
   */
  cardClickFor(): ((card: KanbanCardData) => void) | undefined {
    return this.onCardClick ? this.cardClickHandler : undefined
  }

  /**
   * The card drag-start handler the cards receive — present only when
   * `onCardDragStart` is supplied.
   *
   * @returns The handler, or undefined.
   */
  cardDragFor(): ((card: KanbanCardData, event: DragEvent) => void) | undefined {
    return this.onCardDragStart ? this.cardDragHandler : undefined
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
   * The section's class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The card list's class list.
   *
   * @returns The class string.
   */
  cardsClasses(): string {
    return this.cm().cn(this.cm().stack(2))
  }

  /**
   * The column's heading, as React passes `column.title`.
   *
   * @returns The heading, or undefined before a column is bound.
   */
  columnTitle(): string | number | TemplateRef<unknown> | undefined {
    return this.column?.title
  }

  /**
   * The column's cards, in display order.
   *
   * @returns The cards.
   */
  cards(): KanbanCardData[] {
    return this.column?.cards ?? []
  }

  /**
   * The card count the header shows (React passes `column.cards.length`).
   *
   * @returns The count, or undefined before a column is bound.
   */
  cardCount(): number | undefined {
    return this.column?.cards.length
  }

  /**
   * The outlet context for the header actions and the footer — `{ a0: column }`,
   * the argument React passes to `renderHeaderActions` / `renderFooter`.
   *
   * @returns The outlet context.
   */
  headerContext(): Record<string, unknown> {
    return { a0: this.column }
  }

  /**
   * Handles a drag over the column: React prevents the default only when a drop
   * handler is supplied.
   *
   * @param event - The drag over event.
   */
  handleDragOver(event: DragEvent): void {
    if (!this.onDrop) return
    event.preventDefault()
  }

  /**
   * Handles a drop on the column, reporting the column to `onDrop` — React's own
   * handler does not prevent the default; the consumer decides.
   *
   * @param event - The drop event.
   */
  handleDrop(event: DragEvent): void {
    if (!this.onDrop || !this.column) return
    this.onDrop(this.column, event)
  }
}
