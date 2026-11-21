/**
 * Vue left-hand rail of a timeline row: the marker and an optional connector.
 *
 * Vue counterpart of `@molecule/app-timeline-react`'s `TimelineRail` — the same
 * props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Left-hand rail of a timeline row — renders the marker and an optional
 * vertical connector extending downward.
 *
 * @param props - Component props (see {@link TimelineRailProps}).
 * @returns The rail component.
 */
export const TimelineRail = defineComponent({
  name: 'TimelineRail',
  props: {
    marker: null,
    connector: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    className: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const marker = slotOrProp(slots.marker, props.marker)
      return h(
        'div',
        {
          class: cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.shrink0, props.className),
        },
        [
          h('div', {}, marker.length > 0 ? marker : [h('span', { 'aria-hidden': 'true' }, '•')]),
          ...(props.connector
            ? [
                h('div', {
                  class: cm.cn(cm.w(0 as const), cm.h('full')),
                  style: {
                    borderLeft: '1px solid currentColor',
                    opacity: '0.2',
                    minHeight: '24px',
                  },
                }),
              ]
            : []),
        ],
      )
    }
  },
})
