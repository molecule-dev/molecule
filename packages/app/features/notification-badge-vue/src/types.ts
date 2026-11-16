/**
 * Types for the Vue notification badge, dot and wrapper — the same props
 * `@molecule/app-notification-badge-react` accepts (React names).
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link NotificationBadge} component. */
export interface NotificationBadgeProps {
  /** Numeric count — renders as a pill. When 0 and `hideOnZero` is true, the badge isn't rendered. */
  count: number
  /** Hide the badge when `count` is 0. Defaults to true. */
  hideOnZero?: boolean
  /** When `count > max`, renders as `max+`. Defaults to 99. */
  max?: number
  /** Accent color. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link NotificationDot} component. */
export interface NotificationDotProps {
  /** When false, nothing is rendered. */
  visible?: boolean
  /** Color variant. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Dot size (pixels). Defaults to 8. */
  size?: number
  /** Optional positioning — `'corner'` places absolutely at top-right of parent. */
  position?: 'inline' | 'corner'
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link NotificationWrapper} component. */
export interface NotificationWrapperProps {
  /**
   * The child that should receive the badge (icon button, avatar, nav item).
   * Passed as the default slot or as a `children` prop — both work.
   */
  children?: VNodeChild
  /** Notification count. */
  count: number
  /** Hide the badge when count is 0. Defaults to true. */
  hideOnZero?: boolean
  /** Visual variant. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Corner placement. Defaults to `'top-right'`. */
  placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Extra classes. */
  className?: string
}
