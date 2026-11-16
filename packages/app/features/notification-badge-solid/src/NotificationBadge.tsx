/**
 * Solid notification count badge: a small pill with `max+` overflow handling.
 *
 * Solid counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationBadge` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { Show } from 'solid-js'

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
 * @returns The rendered badge, or nothing while hidden.
 */
export const NotificationBadge: Component<NotificationBadgeProps> = (props) => {
  const cm = getClassMap()
  const hideOnZero = (): boolean => props.hideOnZero ?? true
  const max = (): number => props.max ?? 99
  const variant = (): NonNullable<NotificationBadgeProps['variant']> => props.variant ?? 'error'
  const shown = (): boolean => !(hideOnZero() && props.count <= 0)
  const display = (): string => (props.count > max() ? `${max()}+` : String(props.count))

  return (
    <Show when={shown()}>
      <span
        aria-label={`${props.count}`}
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 1),
          cm.roundedFull,
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          VARIANT_BG[variant()],
          props.className,
        )}
        style={{ 'min-width': '20px', height: '20px' }}
      >
        {display()}
      </span>
    </Show>
  )
}
