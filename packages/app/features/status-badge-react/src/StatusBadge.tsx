import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-react'

/** Semantic status kind used to select badge color variants. */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

/** Props for the {@link StatusBadge} component. */
export interface StatusBadgeProps {
  /** Semantic kind — maps to ClassMap badge color variants. */
  kind?: StatusKind
  /** Badge label (usually `t('...')`). */
  children: ReactNode
  /** Optional leading icon (e.g. a dot or check). */
  icon?: ReactNode
  /**
   * Visual appearance variant.
   * - `'ui'` (default) — wraps `<Badge>` from `@molecule/app-ui-react` with
   *   ClassMap-driven coloring. Honors the active ClassMap bond's badge
   *   styling and works with any theme.
   * - `'uppercase-pill'` — a compact uppercase pill that colors itself with
   *   the SAME ClassMap `badge` tokens as the `'ui'` variant
   *   (`cm.badge({ variant })` → real, theme-backed `bg-*` / `text-*`
   *   utilities), then layers `cm.uppercase` + `cm.trackingWide` for the
   *   uppercase treatment. Every kind is visibly colored in both light and
   *   dark themes.
   */
  appearance?: 'ui' | 'uppercase-pill'
  /** Extra classes passed through to the rendered element. */
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
 * Semantic status badge — maps status kinds to ClassMap color variants.
 * Use for "Open / Closed / Pending / Archived" row labels, deal stages,
 * ticket priorities, etc.
 *
 * Both appearances resolve their color through the ClassMap `badge` tokens,
 * so they stay theme-correct: `appearance="ui"` (default) renders the
 * framework `<Badge>`, and `'uppercase-pill'` renders a compact uppercase
 * pill with the same per-kind `bg-*` / `text-*` colors.
 *
 * @param props - Component props (see {@link StatusBadgeProps}).
 */
export function StatusBadge({
  kind = 'neutral',
  children,
  icon,
  appearance = 'ui',
  className,
}: StatusBadgeProps): JSX.Element {
  const cm = getClassMap()
  if (appearance === 'uppercase-pill') {
    return (
      <span
        className={cm.cn(
          cm.badge({ variant: KIND_TO_COLOR[kind] }),
          cm.uppercase,
          cm.trackingWide,
          className,
        )}
      >
        {icon && <span className={cm.sp('mr', 1)}>{icon}</span>}
        {children}
      </span>
    )
  }
  return (
    <Badge color={KIND_TO_COLOR[kind]} className={className}>
      {icon && <span className={cm.sp('mr', 1)}>{icon}</span>}
      {children}
    </Badge>
  )
}
