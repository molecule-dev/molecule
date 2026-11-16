/**
 * Vue presence dot: a tiny unread / presence indicator.
 *
 * Vue counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationDot` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NotificationDotProps } from './types.js'

// Each variant maps to the background class emitted by a real ClassMap theme
// token. `neutral` uses the `surface-secondary` surface token (what
// `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light and
// dark themes.
const VARIANT_BG: Record<NonNullable<NotificationDotProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-surface-secondary',
}

/**
 * Tiny unread / presence indicator. For counted badges use
 * `<NotificationBadge>`.
 *
 * @param props - Component props (see {@link NotificationDotProps}).
 * @returns The dot component, or nothing when `visible` is false.
 */
export const NotificationDot = defineComponent({
  name: 'NotificationDot',
  props: {
    visible: { type: Boolean, default: true },
    variant: {
      type: String as PropType<NonNullable<NotificationDotProps['variant']>>,
      default: 'error',
    },
    size: { type: Number, default: 8 },
    position: {
      type: String as PropType<NonNullable<NotificationDotProps['position']>>,
      default: 'inline',
    },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode | null => {
      if (!props.visible) return null
      const style: Record<string, string> =
        props.position === 'corner'
          ? {
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: `${props.size}px`,
              height: `${props.size}px`,
            }
          : { display: 'inline-block', width: `${props.size}px`, height: `${props.size}px` }
      return h('span', {
        'aria-hidden': 'true',
        class: cm.cn(cm.roundedFull, VARIANT_BG[props.variant], props.className),
        style,
      })
    }
  },
})
