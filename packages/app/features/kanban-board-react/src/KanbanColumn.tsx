import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { KanbanCard } from './KanbanCard.js'
import { KanbanColumnHeader } from './KanbanColumnHeader.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'

interface KanbanColumnProps {
  column: KanbanColumnData
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Called when a card is dragged into this column. */
  onDrop?: (column: KanbanColumnData, e: React.DragEvent) => void
  /** Called when a card drag-start fires. */
  onCardDragStart?: (card: KanbanCardData, column: KanbanColumnData, e: React.DragEvent) => void
  /** Optional header actions. */
  headerActions?: ReactNode
  /** Optional footer (e.g. "Add card" button). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * One Kanban column — sticky header + scrollable card list + optional footer.
 * @param root0
 * @param root0.column
 * @param root0.onCardClick
 * @param root0.onDrop
 * @param root0.onCardDragStart
 * @param root0.headerActions
 * @param root0.footer
 * @param root0.className
 */
export function KanbanColumn({
  column,
  onCardClick,
  onDrop,
  onCardDragStart,
  headerActions,
  footer,
  className,
}: KanbanColumnProps) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(cm.stack(2), className)}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop ? (e) => onDrop(column, e) : undefined}
    >
      <KanbanColumnHeader
        title={column.title}
        count={column.cards.length}
        actions={headerActions}
      />
      <div className={cm.stack(2)}>
        {column.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            onClick={onCardClick ? (c) => onCardClick(c, column) : undefined}
            onDragStart={onCardDragStart ? (c, e) => onCardDragStart(c, column, e) : undefined}
          />
        ))}
      </div>
      {footer}
    </section>
  )
}
