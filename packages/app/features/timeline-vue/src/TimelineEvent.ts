/**
 * Vue one row of a timeline: rail (marker + connector) + event content.
 *
 * Vue counterpart of `@molecule/app-timeline-react`'s `TimelineEvent` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { TimelineRail } from './TimelineRail.js'
import type { TimelineEventData } from './types.js'

/**
 * One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title / body].
 *
 * @param props - Component props (see {@link TimelineEventProps}).
 * @returns The event component.
 */
export const TimelineEvent = defineComponent({
  name: 'TimelineEvent',
  props: {
    event: {
      type: Object as PropType<TimelineEventData>,
      required: true,
    },
    isLast: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h('div', { class: cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), props.className) }, [
        h(TimelineRail, { marker: props.event.marker, connector: !props.isLast }),
        h('div', { class: cm.cn(cm.flex1, cm.stack(1 as const), cm.sp('pb', 4)) }, [
          h('div', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium')) }, [
            props.event.timestamp,
          ]),
          h('div', { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) }, [
            props.event.title,
          ]),
          ...(props.event.body ? [h('div', { class: cm.textSize('sm') }, [props.event.body])] : []),
        ]),
      ])
  },
})
