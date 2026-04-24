import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { PresenceDot, type PresenceStatus } from './PresenceDot.js'

interface AvatarWithPresenceProps {
  /** The avatar / media to decorate. */
  children: ReactNode
  /** Presence status; omit to hide the dot. */
  status?: PresenceStatus
  /** Corner placement of the dot. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Dot size. */
  dotSize?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Wraps any avatar/image and overlays a presence dot at a corner.
 * Non-destructive — just positions the dot; the child is untouched.
 * @param root0
 * @param root0.children
 * @param root0.status
 * @param root0.corner
 * @param root0.dotSize
 * @param root0.className
 */
export function AvatarWithPresence({
  children,
  status,
  corner = 'bottom-right',
  dotSize,
  className,
}: AvatarWithPresenceProps) {
  const cm = getClassMap()
  return (
    <span className={cm.cn(cm.position('relative'), className)} style={{ display: 'inline-block' }}>
      {children}
      {status && <PresenceDot status={status} position="overlay" corner={corner} size={dotSize} />}
    </span>
  )
}
