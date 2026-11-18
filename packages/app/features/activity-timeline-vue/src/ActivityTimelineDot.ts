/**
 * Vue single dot + icon marker used by `<ActivityTimeline>`. Exposed so
 * consumers can compose their own timeline layouts when the default
 * stacking shape doesn't fit.
 *
 * Vue counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimelineDot` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { TimelineKindTone } from './types.js'

/**
 * Dot + icon marker.
 *
 * @param props - Component props (`tone`, `className`).
 * @returns The dot component.
 */
export const ActivityTimelineDot = defineComponent({
  name: 'ActivityTimelineDot',
  props: {
    tone: { type: Object as PropType<TimelineKindTone>, required: true },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(6),
            cm.h(6),
            cm.position('absolute'),
            cm.roundedFull,
            // Consumer-supplied `dotClass`/`iconClass` win; the package defaults use
            // theme tokens (subtle primary fill + primary icon) that read correctly
            // in both light and dark — never a light-only literal.
            props.tone.dotClass ?? cm.bgPrimarySubtle,
            props.tone.iconClass ?? cm.textPrimary,
            props.className,
          ),
          style: { left: '0px', top: '0px' },
        },
        [h('span', { class: cm.cn(cm.textSize('xs'), cm.iconGlyphFont) }, [props.tone.icon])],
      )
  },
})
