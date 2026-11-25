import type { JSX, ReactNode } from 'react'

import type { DragDropRenderer, DragMoveControls } from '@molecule/app-drag-drop/react'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

import { KanbanCard } from './KanbanCard.js'
import { KanbanColumnHeader } from './KanbanColumnHeader.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'
import { columnDropProps } from './web-drag.js'

/** Props for {@link KanbanColumn}. */
export interface KanbanColumnProps {
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
 * @param props - Component props (see {@link KanbanColumnProps}).
 */
export function KanbanColumn(props: KanbanColumnProps): JSX.Element {
  return <KanbanColumnView {...props} />
}

/** Renders a column with the board's scoped drag bindings when present. */
export function KanbanColumnView({
  column,
  onCardClick,
  onDrop,
  onCardDragStart,
  headerActions,
  footer,
  className,
  drag,
}: KanbanColumnProps & {
  drag?: {
    renderer: DragDropRenderer
    moveControls: (card: KanbanCardData, column: KanbanColumnData) => DragMoveControls
  }
}): JSX.Element {
  const cm = getClassMap()
  const { Source: DragSource, Target: DropTarget } = drag?.renderer ?? {}
  const columnView = (
    <Box
      as="section"
      className={cm.cn(cm.stack(2), className)}
      {...columnDropProps(onDrop ? (event) => onDrop(column, event) : undefined)}
    >
      <KanbanColumnHeader
        title={column.title}
        count={column.cards.length}
        actions={headerActions}
      />
      <Box as="div" className={cm.stack(2)}>
        {column.cards.map((card) => {
          const cardView = (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={onCardClick ? (c) => onCardClick(c, column) : undefined}
              onDragStart={onCardDragStart ? (c, e) => onCardDragStart(c, column, e) : undefined}
            />
          )
          return drag && DragSource ? (
            <DragSource
              key={card.id}
              source={{ id: card.id, data: column.id }}
              controls={drag.moveControls(card, column)}
            >
              {cardView}
            </DragSource>
          ) : (
            cardView
          )
        })}
      </Box>
      {footer}
    </Box>
  )
  return DropTarget ? <DropTarget id={column.id}>{columnView}</DropTarget> : columnView
}
