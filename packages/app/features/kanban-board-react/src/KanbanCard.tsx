import type { DragEvent, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import type { KanbanCardData } from './types.js'

interface KanbanCardProps {
  card: KanbanCardData
  /** Called when the card is clicked (e.g. open detail modal). */
  onClick?: (card: KanbanCardData) => void
  /** HTML5 drag start — integrate with `@molecule/app-drag-drop` bond. */
  onDragStart?: (card: KanbanCardData, e: DragEvent<HTMLDivElement>) => void
  /** Extra classes. */
  className?: string
}

/**
 * Single card inside a Kanban column. Drag-drop is opt-in via the
 * `onDragStart` prop — wire it to the `@molecule/app-drag-drop` bond or
 * HTML5 drag-drop directly.
 *
 * The outer `<div>` wrapper carries the drag handlers so we don't rely
 * on `<Card>` forwarding drag events (which it doesn't).
 * @param root0
 * @param root0.card
 * @param root0.onClick
 * @param root0.onDragStart
 * @param root0.className
 */
export function KanbanCard({ card, onClick, onDragStart, className }: KanbanCardProps) {
  const cm = getClassMap()
  const body: ReactNode = (
    <Card
      className={cm.cn(cm.cursorPointer, className)}
      onClick={onClick ? () => onClick(card) : undefined}
    >
      <div className={cm.stack(2)}>
        <h4 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{card.title}</h4>
        {card.body && <div className={cm.textSize('sm')}>{card.body}</div>}
        {card.footer && (
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>{card.footer}</div>
        )}
      </div>
    </Card>
  )
  if (!onDragStart) return <>{body}</>
  return (
    <div draggable onDragStart={(e) => onDragStart(card, e)}>
      {body}
    </div>
  )
}
