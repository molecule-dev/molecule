import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-react'

/**
 *
 */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label (usually `t('...')`). */
  children: ReactNode
  /** Optional leading icon (e.g. a dot or check). */
  icon?: ReactNode
  /** Extra classes passed through to the underlying Badge. */
  className?: string
}

const KIND_TO_COLOR: Record<StatusKind, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Semantic status badge — thin wrapper around `<Badge>` that maps status
 * kinds to ClassMap color variants. Use for "Open / Closed / Pending /
 * Archived" row labels, deal stages, ticket priorities, etc.
 * @param root0
 * @param root0.kind
 * @param root0.children
 * @param root0.icon
 * @param root0.className
 */
export function StatusBadge({ kind = 'neutral', children, icon, className }: StatusBadgeProps) {
  const cm = getClassMap()
  return (
    <Badge color={KIND_TO_COLOR[kind]} className={className}>
      {icon && <span className={cm.sp('mr', 1)}>{icon}</span>}
      {children}
    </Badge>
  )
}
