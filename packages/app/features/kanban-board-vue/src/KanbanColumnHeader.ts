/**
 * Vue Kanban column heading row — title + count + right actions.
 *
 * Vue counterpart of `@molecule/app-kanban-board-react`'s `KanbanColumnHeader`:
 * the same props (React names) and the same DOM for the same input. `title`
 * and `actions` are node-valued, so each accepts a prop or the same-named slot.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { slotOrProp } from './utilities.js'

/**
 * Kanban column heading row — title + count + right actions.
 *
 * @param props - Component props (see `KanbanColumnHeaderProps`).
 * @returns The heading component.
 */
export const KanbanColumnHeader = defineComponent({
  name: 'KanbanColumnHeader',
  props: {
    /** Column heading (a prop or the same-named slot). */
    title: {
      type: null,
      default: undefined,
    },
    /** Card count shown in parentheses. */
    count: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    /** Optional right-side actions (a prop or the same-named slot). */
    actions: {
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

    return (): VNode =>
      h(
        'header',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('pb', 2),
            props.className,
          ),
        },
        [
          h('div', { class: cm.cn(cm.flex({ align: 'center', gap: 'xs' })) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
              slotOrProp(slots.title, props.title),
            ),
            typeof props.count === 'number'
              ? h('span', { class: cm.cn(cm.textSize('xs')) }, ['(', props.count, ')'])
              : null,
          ]),
          ...slotOrProp(slots.actions, props.actions),
        ],
      )
  },
})
