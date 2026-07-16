import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { PresenceDot, type PresenceStatus } from './PresenceDot.js'

/** Props for {@link AvatarWithPresence}. */
export interface AvatarWithPresenceProps {
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
 * @param props - Component props (see {@link AvatarWithPresenceProps}).
 */
export function AvatarWithPresence({
  children,
  status,
  corner = 'bottom-right',
  dotSize,
  className,
}: AvatarWithPresenceProps): JSX.Element {
  const cm = getClassMap()
  return (
    <span className={cm.cn(cm.position('relative'), className)} style={{ display: 'inline-block' }}>
      {children}
      {status && <PresenceDot status={status} position="overlay" corner={corner} size={dotSize} />}
    </span>
  )
}
