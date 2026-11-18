/**
 * Vue single row in `<ActivityTimeline>`: header / description / meta /
 * footer + a dot on the left, with the connector line drawn by the parent
 * container.
 *
 * Vue counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimelineRow` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineDot } from './ActivityTimelineDot.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The row's default tone when the caller passes none. */
const DEFAULT_TONE: TimelineKindTone = { icon: 'event' }

/**
 * Wraps the row's rendered content (a routing `<Link>`, typically).
 *
 * @param children - The row's own content.
 * @returns The wrapper's content.
 */
type RowWrapper = (children: VNodeChild) => VNodeChild

/**
 * Children for an element: an array stays as it is, `null`/`undefined`
 * contribute nothing, anything else becomes one child.
 *
 * @param value - A node-valued field.
 * @returns The element's children.
 */
const childrenOf = (value: VNodeChild): VNodeChild[] =>
  value == null ? [] : Array.isArray(value) ? value : [value]

/**
 * A single timeline row.
 *
 * @param props - Component props (`event`, `tone`, `wrapper`).
 * @returns The row component.
 */
export const ActivityTimelineRow = defineComponent({
  name: 'ActivityTimelineRow',
  props: {
    event: { type: Object as PropType<TimelineEventData>, required: true },
    tone: Object as PropType<TimelineKindTone>,
    wrapper: Function as PropType<RowWrapper>,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const inner: VNodeChild[] = [
        h(ActivityTimelineDot, { tone: props.tone ?? DEFAULT_TONE }),
        h('div', [
          h(
            'div',
            { class: cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1)) },
            [
              // Title inherits the theme foreground from the card surface — no explicit color.
              h(
                'h3',
                { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) },
                childrenOf(props.event.title),
              ),
              props.event.meta
                ? h(
                    'span',
                    {
                      class: cm.cn(
                        cm.fontWeight('medium'),
                        cm.textSize('xs'),
                        cm.textMuted,
                        cm.uppercase,
                      ),
                      style: { whiteSpace: 'nowrap' },
                    },
                    childrenOf(props.event.meta),
                  )
                : null,
            ],
          ),
          props.event.description
            ? h(
                'p',
                { class: cm.cn(cm.textSize('xs'), cm.textMuted) },
                childrenOf(props.event.description),
              )
            : null,
          props.event.footer ?? null,
        ]),
      ]

      return h(
        'div',
        { class: cm.cn(cm.sp('pl', 10), cm.position('relative')) },
        props.wrapper ? [props.wrapper(inner)] : inner,
      )
    }
  },
})
