/**
 * Solid presence dot: a tiny unread / presence indicator.
 *
 * Solid counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationDot` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'

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
 * @returns The rendered dot, or nothing when `visible` is false.
 */
export const NotificationDot: Component<NotificationDotProps> = (props) => {
  const cm = getClassMap()
  const variant = (): NonNullable<NotificationDotProps['variant']> => props.variant ?? 'error'
  const size = (): number => props.size ?? 8
  const position = (): NonNullable<NotificationDotProps['position']> => props.position ?? 'inline'
  const style = (): JSX.CSSProperties =>
    position() === 'corner'
      ? {
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: `${size()}px`,
          height: `${size()}px`,
        }
      : { display: 'inline-block', width: `${size()}px`, height: `${size()}px` }

  return (
    <Show when={props.visible ?? true}>
      <span
        aria-hidden="true"
        class={cm.cn(cm.roundedFull, VARIANT_BG[variant()], props.className)}
        style={style()}
      />
    </Show>
  )
}
