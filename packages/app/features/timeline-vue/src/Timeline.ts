/**
 * Vue vertical chronological list of events with optional date separators.
 *
 * Vue counterpart of `@molecule/app-timeline-react`'s `Timeline` — the same
 * props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, Fragment, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { TimelineEvent } from './TimelineEvent.js'
import type { TimelineEventData } from './types.js'

/**
 * The empty state's children: the `emptyState` slot wins over the prop, and an
 * absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children React renders for `emptyState`.
 */
const emptyChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Vertical chronological list of events. Each event renders with a
 * marker + connector on the left (`<TimelineEvent>`). Optional date
 * separators can be inserted by returning a node from `renderDateSeparator`.
 *
 * @param props - Component props (see {@link TimelineProps}).
 * @returns The timeline component.
 */
export const Timeline = defineComponent({
  name: 'Timeline',
  props: {
    events: {
      type: Array as PropType<TimelineEventData[]>,
      required: true,
    },
    renderDateSeparator: {
      type: Function as PropType<
        (event: TimelineEventData, prev?: TimelineEventData) => VNodeChild
      >,
      default: undefined,
    },
    emptyState: null,
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const empty = emptyChildren(slots.emptyState, props.emptyState)
      if (props.events.length === 0 && empty.length > 0) return h(Fragment, empty)
      return h(
        'div',
        { class: cm.cn(cm.stack(0 as const), props.className) },
        props.events.map((event, i) => {
          const prev = i > 0 ? props.events[i - 1] : undefined
          const separator = props.renderDateSeparator?.(event, prev)
          return h('div', { key: event.id }, [
            ...(separator != null ? [separator] : []),
            h(TimelineEvent, { event, isLast: i === props.events.length - 1 }),
          ])
        }),
      )
    }
  },
})
