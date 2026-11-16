/**
 * Types of `@molecule/app-kanban-board-angular` — the Angular counterpart of
 * `@molecule/app-kanban-board-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** One card: a stable id plus its rendered title, optional body and footer. */
export interface KanbanCardData {
  /** Card id. */
  id: string
  /** Title / summary: text, or a template reference. */
  title: string | number | TemplateRef<unknown>
  /** Optional body / description: text, or a template reference. */
  body?: string | number | TemplateRef<unknown>
  /** Optional footer row (avatars, tags, timestamps): text, or a template reference. */
  footer?: string | number | TemplateRef<unknown>
}

/** Data for a single kanban column, including its heading, optional accent, and ordered card list. */
export interface KanbanColumnData {
  /** Column id. */
  id: string
  /** Column heading: text, or a template reference. */
  title: string | number | TemplateRef<unknown>
  /** Optional accent color token (cosmetic metadata; React renders nothing for it). */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Cards in the column, in display order. */
  cards: KanbanCardData[]
}

/**
 * Props accepted by {@link KanbanBoard} — the same props
 * `@molecule/app-kanban-board-react` accepts. The render functions
 * (`renderHeaderActions`, `renderFooter`) are `TemplateRef`s whose context
 * carries the column as `a0`, matching React's `(column) => node` call.
 */
export interface KanbanBoardProps {
  /** Columns to render, left to right. */
  columns: KanbanColumnData[]
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
}

/**
 * Props accepted by {@link KanbanColumn} — the same props
 * `@molecule/app-kanban-board-react` accepts. `headerActions` and `footer` are
 * template references, or content projected as `[slot=headerActions]` /
 * `[slot=footer]`.
 */
export interface KanbanColumnProps {
  /** The column to render. */
  column: KanbanColumnData
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
}

/**
 * Props accepted by {@link KanbanCard} — the same props
 * `@molecule/app-kanban-board-react` accepts.
 */
export interface KanbanCardProps {
  /** The card to render. */
  card: KanbanCardData
  /** Called when the card is clicked (e.g. open a detail modal). */
  onClick?: (card: KanbanCardData) => void
  /** HTML5 drag start — adds the `draggable` wrapper when supplied. */
  onDragStart?: (card: KanbanCardData, event: DragEvent) => void
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link KanbanColumnHeader} — the same props
 * `@molecule/app-kanban-board-react` accepts. `title` and `actions` are inputs,
 * or content projected as `[slot=title]` / `[slot=actions]`.
 */
export interface KanbanColumnHeaderProps {
  /** Column heading: text, or a template reference. */
  title?: string | number | TemplateRef<unknown>
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions template. */
  actions?: TemplateRef<unknown>
  /** Extra classes. */
  className?: string
}
