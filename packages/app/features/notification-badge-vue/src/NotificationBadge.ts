/**
 * Vue notification count badge: a small pill with `max+` overflow handling.
 *
 * Vue counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationBadge` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NotificationBadgeProps } from './types.js'

// Each variant maps to the background class emitted by a real ClassMap theme
// token. `neutral` uses the `surface-secondary` surface token (what
// `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light and
// dark themes.
const VARIANT_BG: Record<NonNullable<NotificationBadgeProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-surface-secondary',
}

/**
 * Small count pill — typically attached to a nav item, icon button, or
 * inbox entry. Use `<NotificationDot>` when you just need a presence
 * indicator without a count.
 *
 * @param props - Component props (see {@link NotificationBadgeProps}).
 * @returns The badge component, or nothing while hidden.
 */
export const NotificationBadge = defineComponent({
  name: 'NotificationBadge',
  props: {
    count: { type: Number, required: true },
    hideOnZero: { type: Boolean, default: true },
    max: { type: Number, default: 99 },
    variant: {
      type: String as PropType<NonNullable<NotificationBadgeProps['variant']>>,
      default: 'error',
    },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode | null => {
      if (props.hideOnZero && props.count <= 0) return null
      const display = props.count > props.max ? `${props.max}+` : String(props.count)
      return h(
        'span',
        {
          'aria-label': `${props.count}`,
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('px', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            VARIANT_BG[props.variant],
            props.className,
          ),
          style: { minWidth: '20px', height: '20px' },
        },
        display,
      )
    }
  },
})
