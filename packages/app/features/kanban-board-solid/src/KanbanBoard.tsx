/**
 * Solid Kanban board with HTML5 drag-drop between columns.
 *
 * Solid counterpart of `@molecule/app-kanban-board-react`'s `KanbanBoard` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. Pure UI: consumers own the card data and persist moves in
 * `onCardMove`.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { KanbanColumn } from './KanbanColumn.jsx'
import type { KanbanBoardProps, KanbanCardData, KanbanColumnData } from './types.js'

/**
 * Kanban board with HTML5 drag-drop between columns.
 *
 * The drag payload is the same JSON React writes under `text/molecule-kanban`:
 * `{ cardId, fromColumnId }`. A drop on the source column is ignored, and a
 * malformed payload cancels the drop without a callback.
 *
 * @param props - Component props (see {@link KanbanBoardProps}).
 * @returns The rendered board.
 */
export const KanbanBoard: Component<KanbanBoardProps> = (props) => {
  const cm = getClassMap()

  /**
   * Stores the card identity in the drag payload so the drop handler knows
   * the source column (the same JSON React writes).
   *
   * @param card - The dragged card.
   * @param column - The column it started from.
   * @param event - The drag start event.
   */
  const onCardDragStart = (
    card: KanbanCardData,
    column: KanbanColumnData,
    event: DragEvent,
  ): void => {
    event.dataTransfer?.setData(
      'text/molecule-kanban',
      JSON.stringify({ cardId: card.id, fromColumnId: column.id }),
    )
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Handles a card drop onto a column, parsing the drag payload and invoking
   * `onCardMove` when the card came from a different column.
   *
   * @param column - The column dropped on.
   * @param event - The drop event.
   */
  const onDrop = (column: KanbanColumnData, event: DragEvent): void => {
    event.preventDefault()
    const payload = event.dataTransfer?.getData('text/molecule-kanban')
    if (!payload || !props.onCardMove) return
    try {
      const { cardId, fromColumnId } = JSON.parse(payload) as {
        cardId: string
        fromColumnId: string
      }
      if (fromColumnId !== column.id) props.onCardMove(cardId, fromColumnId, column.id)
    } catch (_error) {
      // Safe to ignore: the dataTransfer payload is untrusted/malformed, so the drop is cancelled.
    }
  }

  const headerActions = (column: KanbanColumnData): JSX.Element =>
    props.renderHeaderActions ? props.renderHeaderActions(column) : null
  const footer = (column: KanbanColumnData): JSX.Element =>
    props.renderFooter ? props.renderFooter(column) : null

  return (
    <div class={cm.cn(cm.flex({ align: 'start', gap: 'md' }), props.className)}>
      <For each={props.columns}>
        {(column) => (
          <div class={cm.cn(cm.flex1)}>
            <KanbanColumn
              column={column}
              onCardClick={props.onCardClick}
              onDrop={props.onCardMove ? onDrop : undefined}
              onCardDragStart={onCardDragStart}
              headerActions={headerActions(column)}
              footer={footer(column)}
            />
          </div>
        )}
      </For>
    </div>
  )
}
