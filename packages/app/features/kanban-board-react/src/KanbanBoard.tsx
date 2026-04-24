import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { KanbanColumn } from './KanbanColumn.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'

interface KanbanBoardProps {
  columns: KanbanColumnData[]
  /** Called when a card moves from one column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Optional per-column header action renderer. */
  renderHeaderActions?: (column: KanbanColumnData) => ReactNode
  /** Optional per-column footer renderer (e.g. "+ Add card"). */
  renderFooter?: (column: KanbanColumnData) => ReactNode
  /** Extra classes on the outer board wrapper. */
  className?: string
}

/**
 * Kanban board with HTML5 drag-drop between columns.
 *
 * Pure UI — consumers own the card data and call back on `onCardMove`
 * to persist reorder. For fancier drag experiences, wire
 * `@molecule/app-drag-drop` at the column level instead.
 *
 * @param root0
 * @param root0.columns
 * @param root0.onCardMove
 * @param root0.onCardClick
 * @param root0.renderHeaderActions
 * @param root0.renderFooter
 * @param root0.className
 * @example
 * ```tsx
 * <KanbanBoard
 *   columns={[
 *     { id: 'todo', title: 'To do', cards: [...] },
 *     { id: 'doing', title: 'In progress', cards: [...] },
 *     { id: 'done', title: 'Done', cards: [...] },
 *   ]}
 *   onCardMove={(cardId, from, to) => moveCard(cardId, to)}
 * />
 * ```
 */
export function KanbanBoard({
  columns,
  onCardMove,
  onCardClick,
  renderHeaderActions,
  renderFooter,
  className,
}: KanbanBoardProps) {
  const cm = getClassMap()

  /**
   *
   * @param card
   * @param column
   * @param e
   */
  function onCardDragStart(card: KanbanCardData, column: KanbanColumnData, e: React.DragEvent) {
    e.dataTransfer.setData(
      'text/molecule-kanban',
      JSON.stringify({ cardId: card.id, fromColumnId: column.id }),
    )
    e.dataTransfer.effectAllowed = 'move'
  }

  /**
   *
   * @param column
   * @param e
   */
  function onDrop(column: KanbanColumnData, e: React.DragEvent) {
    e.preventDefault()
    const payload = e.dataTransfer.getData('text/molecule-kanban')
    if (!payload || !onCardMove) return
    try {
      const { cardId, fromColumnId } = JSON.parse(payload) as {
        cardId: string
        fromColumnId: string
      }
      if (fromColumnId !== column.id) onCardMove(cardId, fromColumnId, column.id)
    } catch {
      // ignore malformed drop payloads
    }
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), className)}>
      {columns.map((col) => (
        <div key={col.id} className={cm.flex1}>
          <KanbanColumn
            column={col}
            onCardClick={onCardClick}
            onDrop={onCardMove ? onDrop : undefined}
            onCardDragStart={onCardDragStart}
            headerActions={renderHeaderActions?.(col)}
            footer={renderFooter?.(col)}
          />
        </div>
      ))}
    </div>
  )
}
