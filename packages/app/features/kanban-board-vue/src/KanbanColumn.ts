/**
 * Vue Kanban column — sticky header + card list + optional footer.
 *
 * Vue counterpart of `@molecule/app-kanban-board-react`'s `KanbanColumn`: the
 * same props (React names) and the same DOM for the same input. The drop
 * handlers exist only when `onDrop` is supplied, exactly as React gates them.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { KanbanCard } from './KanbanCard.js'
import { KanbanColumnHeader } from './KanbanColumnHeader.js'
import type { KanbanCardData, KanbanColumnData } from './types.js'
import { nodesOf } from './utilities.js'

/** A card click handler taking the card and the column it sits in. */
type CardClickHandler = (card: KanbanCardData, column: KanbanColumnData) => void

/** A drop handler taking the column and the drop event. */
type DropHandler = (column: KanbanColumnData, event: DragEvent) => void

/** A card drag-start handler taking the card, its column and the event. */
type CardDragStartHandler = (
  card: KanbanCardData,
  column: KanbanColumnData,
  event: DragEvent,
) => void

/**
 * One Kanban column — header + card list + optional footer.
 *
 * @param props - Component props (see `KanbanColumnProps`).
 * @returns The column component.
 */
export const KanbanColumn = defineComponent({
  name: 'KanbanColumn',
  props: {
    /** The column to render. */
    column: {
      type: Object as PropType<KanbanColumnData>,
      required: true,
    },
    /** Called when a card is clicked. */
    onCardClick: {
      type: Function as PropType<CardClickHandler | undefined>,
      default: undefined,
    },
    /** Called when a card is dragged into this column. */
    onDrop: {
      type: Function as PropType<DropHandler | undefined>,
      default: undefined,
    },
    /** Called when a card drag-start fires. */
    onCardDragStart: {
      type: Function as PropType<CardDragStartHandler | undefined>,
      default: undefined,
    },
    /** Optional header actions (a prop or the same-named slot). */
    headerActions: {
      type: null,
      default: undefined,
    },
    /** Optional footer (a prop or the same-named slot). */
    footer: {
      type: null,
      default: undefined,
    },
    /** Extra classes. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const headerActions: VNodeChild[] = slots.headerActions
        ? slots.headerActions()
        : nodesOf(props.headerActions)
      const footer: VNodeChild[] = slots.footer ? slots.footer() : nodesOf(props.footer)

      return h(
        'section',
        {
          class: cm.cn(cm.stack(2), props.className),
          onDragover: props.onDrop ? (event: DragEvent) => event.preventDefault() : undefined,
          onDrop: props.onDrop
            ? (event: DragEvent) => props.onDrop?.(props.column, event)
            : undefined,
        },
        [
          h(KanbanColumnHeader, {
            title: props.column.title,
            count: props.column.cards.length,
            actions: headerActions,
          }),
          h(
            'div',
            { class: cm.cn(cm.stack(2)) },
            props.column.cards.map((card) =>
              h(KanbanCard, {
                key: card.id,
                card,
                onClick: props.onCardClick
                  ? (clicked: KanbanCardData) => props.onCardClick?.(clicked, props.column)
                  : undefined,
                onDragStart: props.onCardDragStart
                  ? (dragged: KanbanCardData, event: DragEvent) =>
                      props.onCardDragStart?.(dragged, props.column, event)
                  : undefined,
              }),
            ),
          ),
          ...footer,
        ],
      )
    }
  },
})
