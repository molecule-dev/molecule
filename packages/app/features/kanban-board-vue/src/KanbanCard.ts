/**
 * Vue Kanban card — a `Card` with the card's title, optional body and footer.
 *
 * Vue counterpart of `@molecule/app-kanban-board-react`'s `KanbanCard`: the
 * same props (React names) and the same DOM for the same input. Drag-drop is
 * opt-in via `onDragStart` — with it the card gains the same outer
 * `draggable` div React renders; without it the `Card` itself is the root.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import type { KanbanCardData } from './types.js'

/**
 * Single card inside a Kanban column.
 *
 * @param props - Component props (see `KanbanCardProps`).
 * @returns The card component.
 */
export const KanbanCard = defineComponent({
  name: 'KanbanCard',
  props: {
    /** The card to render. */
    card: {
      type: Object as PropType<KanbanCardData>,
      required: true,
    },
    /** Called when the card is clicked (e.g. open a detail modal). */
    onClick: {
      type: Function as PropType<((card: KanbanCardData) => void) | undefined>,
      default: undefined,
    },
    /** HTML5 drag start — adds the `draggable` wrapper when supplied. */
    onDragStart: {
      type: Function as PropType<((card: KanbanCardData, event: DragEvent) => void) | undefined>,
      default: undefined,
    },
    /** Extra classes. */
    className: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const content: VNodeChild[] = [
        h('div', { class: cm.cn(cm.stack(2)) }, [
          h('h4', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, [
            props.card.title,
          ]),
          props.card.body ? h('div', { class: cm.cn(cm.textSize('sm')) }, [props.card.body]) : null,
          props.card.footer
            ? h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })) }, [
                props.card.footer,
              ])
            : null,
        ]),
      ]

      const body = h(
        Card,
        {
          className: cm.cn(cm.cursorPointer, props.className),
          onClick: props.onClick ? () => props.onClick?.(props.card) : undefined,
        },
        () => content,
      )

      if (!props.onDragStart) return body
      return h(
        'div',
        {
          draggable: true,
          onDragstart: (event: DragEvent) => props.onDragStart?.(props.card, event),
        },
        [body],
      )
    }
  },
})
