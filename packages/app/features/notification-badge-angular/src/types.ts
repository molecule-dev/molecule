/**
 * Types of `@molecule/app-notification-badge-angular` — the Angular
 * counterpart of `@molecule/app-notification-badge-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link NotificationBadge} — the same props
 * `@molecule/app-notification-badge-react` accepts.
 */
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

/**
 * Props accepted by {@link NotificationDot} — the same props
 * `@molecule/app-notification-badge-react` accepts.
 */
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

/**
 * Props accepted by {@link NotificationWrapper} — the same props
 * `@molecule/app-notification-badge-react` accepts. The child is projected
 * content in Angular (an input cannot carry a node), so it is typed
 * `unknown`: pass it in the host template, not as a value.
 */
export interface NotificationWrapperProps {
  /** The child that should receive the badge (icon button, avatar, nav item). */
  children?: unknown
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
