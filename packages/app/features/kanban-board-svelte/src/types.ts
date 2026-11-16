/**
 * Types for the Svelte Kanban board primitives — the Svelte counterpart of
 * `@molecule/app-kanban-board-react`'s types, with snippets where React has
 * `ReactNode`.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** One card: a stable id plus its rendered title, optional body and footer. */
export interface KanbanCardData {
  /** Card id. */
  id: string
  /** Title / summary (a snippet, or plain text). */
  title: Snippet | string | number
  /** Optional body / description (a snippet, or plain text). */
  body?: Snippet | string | number
  /** Optional footer row (avatars, tags, timestamps). */
  footer?: Snippet | string | number
}

/** Data for a single kanban column, including its heading, optional accent, and ordered card list. */
export interface KanbanColumnData {
  /** Column id. */
  id: string
  /** Column heading (a snippet, or plain text). */
  title: Snippet | string | number
  /** Optional accent color token (cosmetic metadata; React renders nothing for it). */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Cards in the column, in display order. */
  cards: KanbanCardData[]
}

/** Props accepted by the {@link KanbanBoard} component (React's prop names). */
export interface KanbanBoardProps {
  /** Columns to render, left to right. */
  columns: readonly KanbanColumnData[]
  /** Called when a card moves from one column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Optional per-column header action renderer (a snippet taking the column). */
  renderHeaderActions?: Snippet<[KanbanColumnData]>
  /** Optional per-column footer renderer (a snippet taking the column). */
  renderFooter?: Snippet<[KanbanColumnData]>
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
  /** Optional header actions. */
  headerActions?: Snippet
  /** Optional footer (e.g. "Add card"). */
  footer?: Snippet
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
  /** Column heading (a snippet, or plain text). */
  title: Snippet | string | number
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions (add card button, menu). */
  actions?: Snippet
  /** Extra classes. */
  className?: string
}
