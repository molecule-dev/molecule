import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { NotificationBadge } from './NotificationBadge.js'

export interface NotificationWrapperProps {
  /** The child that should receive the badge (icon button, avatar, nav item). */
  children: ReactNode
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

/**
 * Positions a `<NotificationBadge>` at a corner of any child element.
 * The wrapper becomes `relative` so the badge absolutely positions
 * correctly — wrap icon buttons, avatars, or nav entries.
 * @param props - Component props (see {@link NotificationWrapperProps}).
 */
export function NotificationWrapper({
  children,
  count,
  hideOnZero = true,
  variant = 'error',
  placement = 'top-right',
  className,
}: NotificationWrapperProps): React.JSX.Element {
  const cm = getClassMap()
  const style: React.CSSProperties = { position: 'absolute' }
  if (placement.includes('top')) style.top = -4
  if (placement.includes('bottom')) style.bottom = -4
  if (placement.includes('right')) style.right = -4
  if (placement.includes('left')) style.left = -4
  return (
    <span className={cm.cn(cm.position('relative'), className)} style={{ display: 'inline-block' }}>
      {children}
      <span style={style}>
        <NotificationBadge count={count} hideOnZero={hideOnZero} variant={variant} />
      </span>
    </span>
  )
}
