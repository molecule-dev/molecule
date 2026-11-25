import type { DragEvent, JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import type { KanbanCardData } from './types.js'
import { cardDragProps } from './web-drag.js'

/** Props for {@link KanbanCard}. */
export interface KanbanCardProps {
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
 * @param props - Component props (see {@link KanbanCardProps}).
 */
export function KanbanCard({
  card,
  onClick,
  onDragStart,
  className,
}: KanbanCardProps): JSX.Element {
  const cm = getClassMap()
  const body: ReactNode = (
    <Card
      className={cm.cn(cm.cursorPointer, className)}
      onClick={onClick ? () => onClick(card) : undefined}
    >
      <Box as="div" className={cm.stack(2)}>
        <Text as="h4" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {card.title}
        </Text>
        {card.body && (
          <Box as="div" className={cm.textSize('sm')}>
            {card.body}
          </Box>
        )}
        {card.footer && (
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            {card.footer}
          </Box>
        )}
      </Box>
    </Card>
  )
  if (!onDragStart) return <>{body}</>
  return (
    <Box as="div" {...cardDragProps((event) => onDragStart(card, event))}>
      {body}
    </Box>
  )
}
