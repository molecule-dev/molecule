/**
 * Types for the Vue Kanban board primitives — the Vue counterpart of
 * `@molecule/app-kanban-board-react`'s types, with Vue nodes where React has
 * `ReactNode`.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** One card: a stable id plus its rendered title, optional body and footer. */
export interface KanbanCardData {
  /** Card id. */
  id: string
  /** Title / summary. */
  title: VNodeChild
  /** Optional body / description. */
  body?: VNodeChild
  /** Optional footer row (avatars, tags, timestamps). */
  footer?: VNodeChild
}

/** Data for a single kanban column, including its heading, optional accent, and ordered card list. */
export interface KanbanColumnData {
  /** Column id. */
  id: string
  /** Column heading. */
  title: VNodeChild
  /** Optional accent color token (cosmetic metadata; React renders nothing for it). */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Cards in the column, in display order. */
  cards: KanbanCardData[]
}

/** Props accepted by the {@link KanbanBoard} component (React's prop names). */
export interface KanbanBoardProps {
  /** Columns to render, left to right. */
  columns: KanbanColumnData[]
  /** Called when a card moves from one column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Optional per-column header action renderer. */
  renderHeaderActions?: (column: KanbanColumnData) => VNodeChild
  /** Optional per-column footer renderer (e.g. "+ Add card"). */
  renderFooter?: (column: KanbanColumnData) => VNodeChild
  /** Extra classes on the outer board wrapper. */
  className?: string
}

/** Props accepted by the {@link KanbanColumn} component (React's prop names). */
export interface KanbanColumnProps {
  /** The column to render. */
  column: KanbanColumnData
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Called when a card is dragged into this column. */
  onDrop?: (column: KanbanColumnData, event: DragEvent) => void
  /** Called when a card drag-start fires. */
  onCardDragStart?: (card: KanbanCardData, column: KanbanColumnData, event: DragEvent) => void
  /** Optional header actions (a prop or the same-named slot). */
  headerActions?: VNodeChild
  /** Optional footer (e.g. "Add card"; a prop or the same-named slot). */
  footer?: VNodeChild
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link KanbanCard} component (React's prop names). */
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

/** Props accepted by the {@link KanbanColumnHeader} component (React's prop names). */
export interface KanbanColumnHeaderProps {
  /** Column heading (a prop or the same-named slot). */
  title?: VNodeChild
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions (a prop or the same-named slot). */
  actions?: VNodeChild
  /** Extra classes. */
  className?: string
}
