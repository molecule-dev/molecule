/**
 * Vue vertical ordered-step status timeline: dots colored by reached state,
 * current step bolded. Vue counterpart of
 * `@molecule/app-status-timeline-react`'s `StatusTimeline` — the same props
 * (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { StatusTimelineStep } from './types.js'

/**
 * Vertical ordered-step status timeline.
 *
 * Each step renders as a colored dot + label. Steps at or before the
 * current one are "reached" (filled dot); the current step's label is
 * bolded; steps after the current one are dimmed via `cm.textMuted`.
 *
 * @param props - Component props (see {@link StatusTimelineProps}).
 * @returns The status timeline component.
 */
export const StatusTimeline = defineComponent({
  name: 'StatusTimeline',
  props: {
    steps: {
      type: Array as PropType<ReadonlyArray<StatusTimelineStep>>,
      required: true,
    },
    currentKey: {
      type: String,
      required: true,
    },
    ariaLabel: {
      type: String,
      default: undefined,
    },
    className: {
      type: String,
      default: undefined,
    },
    dataMolId: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()

    /** A step's entry: dot + label, reached and bolded per the current index. */
    const item = (step: StatusTimelineStep, i: number, currentIdx: number): VNode => {
      const reached = currentIdx >= 0 && i <= currentIdx
      const isCurrent = i === currentIdx
      return h('li', { key: step.key, class: cm.flex({ align: 'center', gap: 'sm' }) }, [
        h('span', {
          class: cm.cn(
            cm.roundedFull,
            cm.statusTimelineDot,
            reached ? cm.bgPrimary : cm.statusTimelineDotIdle,
          ),
          'aria-hidden': 'true',
        }),
        h(
          'span',
          { class: cm.cn(reached ? '' : cm.textMuted, isCurrent ? cm.fontWeight('semibold') : '') },
          step.label,
        ),
      ])
    }

    return (): VNode => {
      const currentIdx = props.steps.findIndex((s) => s.key === props.currentKey)
      return h(
        'ol',
        {
          class: cm.cn(cm.statusTimelineList, cm.textSize('sm'), props.className),
          'aria-label': props.ariaLabel,
          'data-mol-id': props.dataMolId,
        },
        props.steps.map((step, i) => item(step, i, currentIdx)),
      )
    }
  },
})
