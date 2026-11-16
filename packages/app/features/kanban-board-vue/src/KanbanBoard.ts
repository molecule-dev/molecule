/**
 * Vue Kanban board with HTML5 drag-drop between columns.
 *
 * Vue counterpart of `@molecule/app-kanban-board-react`'s `KanbanBoard` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. Pure UI: consumers own the card data and persist moves in
 * `onCardMove`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { KanbanColumn } from './KanbanColumn.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'
import { nodesOf } from './utilities.js'

/** A card move handler taking the card and its source and target columns. */
type CardMoveHandler = (cardId: string, fromColumnId: string, toColumnId: string) => void

/** A card click handler taking the card and the column it sits in. */
type CardClickHandler = (card: KanbanCardData, column: KanbanColumnData) => void

/** A per-column renderer for the header actions or the footer. */
type ColumnRenderer = (column: KanbanColumnData) => VNodeChild

/**
 * Kanban board with HTML5 drag-drop between columns.
 *
 * The drag payload is the same JSON React writes under `text/molecule-kanban`:
 * `{ cardId, fromColumnId }`. A drop on the source column is ignored, and a
 * malformed payload cancels the drop without a callback.
 *
 * @param props - Component props (see `KanbanBoardProps`).
 * @returns The board component.
 */
export const KanbanBoard = defineComponent({
  name: 'KanbanBoard',
  props: {
    /** Columns to render, left to right. */
    columns: {
      type: Array as PropType<KanbanColumnData[]>,
      required: true,
    },
    /** Called when a card moves from one column to another. */
    onCardMove: {
      type: Function as PropType<CardMoveHandler | undefined>,
      default: undefined,
    },
    /** Called when a card is clicked. */
    onCardClick: {
      type: Function as PropType<CardClickHandler | undefined>,
      default: undefined,
    },
    /** Optional per-column header action renderer. */
    renderHeaderActions: {
      type: Function as PropType<ColumnRenderer | undefined>,
      default: undefined,
    },
    /** Optional per-column footer renderer (e.g. "+ Add card"). */
    renderFooter: {
      type: Function as PropType<ColumnRenderer | undefined>,
      default: undefined,
    },
    /** Extra classes on the outer board wrapper. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * Stores the card identity in the drag payload so the drop handler knows
     * the source column (the same JSON React writes).
     *
     * @param card - The dragged card.
     * @param column - The column it started from.
     * @param event - The drag start event.
     */
    function onCardDragStart(
      card: KanbanCardData,
      column: KanbanColumnData,
      event: DragEvent,
    ): void {
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
    function onDrop(column: KanbanColumnData, event: DragEvent): void {
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

    return (): VNode =>
      h(
        'div',
        { class: cm.cn(cm.flex({ align: 'start', gap: 'md' }), props.className) },
        props.columns.map((column) =>
          h('div', { key: column.id, class: cm.cn(cm.flex1) }, [
            h(KanbanColumn, {
              column,
              onCardClick: props.onCardClick,
              onDrop: props.onCardMove ? onDrop : undefined,
              onCardDragStart,
              headerActions: nodesOf(props.renderHeaderActions?.(column)),
              footer: nodesOf(props.renderFooter?.(column)),
            }),
          ]),
        ),
      )
  },
})
