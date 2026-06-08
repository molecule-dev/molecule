import type { ReactNode } from 'react'

/**
 * Kanban board types.
 *
 * @module
 */
export interface KanbanCardData {
  /** Card id. */
  id: string
  /** Title / summary. */
  title: ReactNode
  /** Optional body / description. */
  body?: ReactNode
  /** Optional footer row (avatars, tags, timestamps). */
  footer?: ReactNode
}

/** Data for a single kanban column, including its heading, optional accent, and ordered card list. */
export interface KanbanColumnData {
  /** Column id. */
  id: string
  /** Column heading. */
  title: ReactNode
  /** Optional accent color token. */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Cards in the column, in display order. */
  cards: KanbanCardData[]
}
