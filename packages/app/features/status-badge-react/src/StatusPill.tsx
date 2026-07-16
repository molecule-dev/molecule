import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import type { StatusKind } from './StatusBadge.js'

/** Props for the {@link StatusPill} component. */
export interface StatusPillProps {
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
 * Rounded status pill with an optional leading colored dot. The pill has
 * NO background surface of its own — only the dot carries color — so add
 * a surface via `className` if you need a filled pill. The `neutral` dot
 * uses `bg-outline`, which is only visible in themes that define an
 * `outline` color token.
 * @param props - Component props (see {@link StatusPillProps}).
 */
export function StatusPill({
  kind = 'neutral',
  children,
  dot = true,
  className,
}: StatusPillProps): JSX.Element {
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
