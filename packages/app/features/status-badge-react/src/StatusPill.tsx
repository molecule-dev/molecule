import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { StatusKind } from './StatusBadge.js'

interface StatusPillProps {
  /** Semantic kind. */
  kind?: StatusKind
  /** Pill label. */
  children: ReactNode
  /** Render a leading dot indicator. Defaults to true. */
  dot?: boolean
  /** Extra classes. */
  className?: string
}

const DOT_COLOR: Record<StatusKind, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-outline',
}

/**
 * Rounded status pill with an optional leading colored dot.
 * Taller and more visually distinct than `<StatusBadge>` — useful as
 * a primary row indicator in tables and cards.
 * @param root0
 * @param root0.kind
 * @param root0.children
 * @param root0.dot
 * @param root0.className
 */
export function StatusPill({ kind = 'neutral', children, dot = true, className }: StatusPillProps) {
  const cm = getClassMap()
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.roundedFull,
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        className,
      )}
    >
      {dot && (
        <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, DOT_COLOR[kind])} aria-hidden />
      )}
      {children}
    </span>
  )
}
