/**
 * Vue status pill: a rounded pill with an optional leading colored dot.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { StatusKind } from './types.js'

const DOT_COLOR: Record<StatusKind, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-outline',
}

/**
 * Rounded status pill with an optional leading colored dot. The pill has NO
 * background surface of its own — only the dot carries color — so add a
 * surface via `className` if you need a filled pill.
 *
 * @param props - Component props (see `StatusPillProps`).
 * @returns The status pill component.
 */
export const StatusPill = defineComponent({
  name: 'StatusPill',
  props: {
    kind: {
      type: String as PropType<StatusKind>,
      default: 'neutral',
    },
    children: null,
    dot: {
      type: Boolean,
      default: true,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'span',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            props.className,
          ),
        },
        [
          ...(props.dot
            ? [
                h('span', {
                  class: cm.cn(cm.w(2), cm.h(2), cm.roundedFull, DOT_COLOR[props.kind]),
                  'aria-hidden': 'true',
                }),
              ]
            : []),
          ...(slots.default
            ? slots.default()
            : props.children != null
              ? [props.children as VNodeChild]
              : []),
        ],
      )
  },
})
