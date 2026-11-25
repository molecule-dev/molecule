import type { JSX, ReactNode } from 'react'

import type { DragEndEvent } from '@molecule/app-drag-drop'
import { type DragMoveControls, useDragDropRenderer } from '@molecule/app-drag-drop/react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

import { KanbanColumnView } from './KanbanColumn.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'
import { readCardDrop, writeCardDrag } from './web-drag.js'

/** Props for {@link KanbanBoard}. */
export interface KanbanBoardProps {
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
 * Kanban board with drag and drop between columns.
 *
 * Consumers own the card data and persist moves from `onCardMove`.
 *
 * @param props - Component props (see {@link KanbanBoardProps}).
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
}: KanbanBoardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const renderer = useDragDropRenderer()

  /** Validates an adapter's drop against the current board before emitting a move. */
  function moveCard({ id, overId, data: fromId }: DragEndEvent): void {
    if (typeof fromId !== 'string' || overId === undefined || fromId === overId) return
    const source = columns.find((column) => column.id === fromId)
    if (!source?.cards.some((card) => card.id === id)) return
    if (!columns.some((column) => column.id === overId)) return
    onCardMove?.(id, fromId, overId)
  }

  /** Labels the native alternatives to dragging a card. */
  function moveControls(card: KanbanCardData, from: KanbanColumnData): DragMoveControls {
    const cardLabel = typeof card.title === 'string' ? card.title : card.id
    return {
      id: `kanban-move-${from.id}-${card.id}`,
      label: t('ui.dragDrop.moveItem', { item: cardLabel }, { defaultValue: 'Move {{item}}' }),
      cancelLabel: t('ui.dragDrop.cancelMove', {}, { defaultValue: 'Cancel move' }),
      className: cm.cn(cm.button({ variant: 'outline', size: 'xs' }), cm.touchTargetCompact),
      choices: columns
        .filter((column) => column.id !== from.id)
        .map((column) => ({
          targetId: column.id,
          label: t(
            'ui.dragDrop.moveItemTo',
            {
              item: cardLabel,
              destination: typeof column.title === 'string' ? column.title : column.id,
            },
            { defaultValue: 'Move {{item}} to {{destination}}' },
          ),
        })),
    }
  }

  const nativeDrag = renderer && onCardMove ? { renderer, moveControls } : undefined
  const DragScope = nativeDrag?.renderer.Scope
  const board = (
    <Box as="div" className={cm.cn(cm.flex({ align: 'start', gap: 'md' }), className)}>
      {columns.map((col) => (
        <Box as="div" key={col.id} className={cm.flex1}>
          <KanbanColumnView
            column={col}
            onCardClick={onCardClick}
            onDrop={
              !renderer && onCardMove
                ? (column, event) => {
                    const drop = readCardDrop(event, column.id)
                    if (drop) moveCard(drop)
                  }
                : undefined
            }
            onCardDragStart={
              renderer
                ? undefined
                : (card, column, event) => writeCardDrag(event, card.id, column.id)
            }
            drag={nativeDrag}
            headerActions={renderHeaderActions?.(col)}
            footer={renderFooter?.(col)}
          />
        </Box>
      ))}
    </Box>
  )
  return DragScope ? <DragScope onDragEnd={moveCard}>{board}</DragScope> : board
}
