/**
 * Vue semantic status badge: maps status kinds to ClassMap color variants,
 * with a framework `<Badge>` (`appearance='ui'`, default) or a compact
 * uppercase pill appearance.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-vue'
import { toChildArray } from '@molecule/app-vue'

import type { StatusKind } from './types.js'

const KIND_TO_COLOR: Record<StatusKind, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Resolves a node-valued prop that may arrive as a prop or a same-named slot:
 * the slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const nodeOf = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Semantic status badge — maps status kinds to ClassMap color variants.
 *
 * Both appearances resolve their color through the ClassMap `badge` tokens,
 * so they stay theme-correct: `appearance="ui"` (default) renders the
 * framework `<Badge>`, and `'uppercase-pill'` renders a compact uppercase pill
 * with the same per-kind `bg-*` / `text-*` colors.
 *
 * @param props - Component props (see `StatusBadgeProps`).
 * @returns The status badge component.
 */
export const StatusBadge = defineComponent({
  name: 'StatusBadge',
  props: {
    kind: {
      type: String as PropType<StatusKind>,
      default: 'neutral',
    },
    children: null,
    icon: null,
    appearance: {
      type: String as PropType<'ui' | 'uppercase-pill'>,
      default: 'ui',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const children = nodeOf(slots.default, props.children as VNodeChild | null | undefined)
      const icon = nodeOf(slots.icon, props.icon as VNodeChild | null | undefined)
      const content: VNodeChild[] = [
        ...(toChildArray(icon).length > 0 ? [h('span', { class: cm.sp('mr', 1) }, icon)] : []),
        ...children,
      ]
      const color = KIND_TO_COLOR[props.kind]
      if (props.appearance === 'uppercase-pill') {
        return h(
          'span',
          {
            class: cm.cn(
              cm.badge({ variant: color }),
              cm.uppercase,
              cm.trackingWide,
              props.className,
            ),
          },
          content,
        )
      }
      return h(Badge, { color, className: props.className }, () => content)
    }
  },
})
