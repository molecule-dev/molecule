/**
 * Vue date separator rendered between timeline groups.
 *
 * Vue counterpart of `@molecule/app-timeline-react`'s `TimelineDate` — the same
 * props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Date separator rendered between timeline groups.
 *
 * @param props - Component props (see {@link TimelineDateProps}).
 * @returns The date separator component.
 */
export const TimelineDate = defineComponent({
  name: 'TimelineDate',
  props: {
    children: null,
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const content: VNodeChild[] = slots.default
        ? slots.default()
        : props.children != null
          ? [props.children]
          : []
      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 2),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            props.className,
          ),
        },
        [h('span', { class: cm.flex1 }, content)],
      )
    }
  },
})
