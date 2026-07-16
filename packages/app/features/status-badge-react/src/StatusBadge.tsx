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
   *   styling and works with any theme. Prefer this variant.
   * - `'uppercase-pill'` — raw utility pattern
   *   (`text-[10px] font-black uppercase tracking-widest rounded-full`)
   *   colored with Material-3 container-token utilities
   *   (`bg-success-container text-on-success-container`, …). Those tokens
   *   exist in NO current theme (flagship or minimal scaffold), so this
   *   variant currently renders a colorless transparent pill everywhere.
   *   Do not use it until its styling is migrated to ClassMap/theme-backed
   *   tokens.
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

const KIND_TO_PILL_CLASSES: Record<StatusKind, string> = {
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  error: 'bg-error-container text-on-error-container',
  info: 'bg-info-container text-on-info-container',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

/**
 * Semantic status badge — maps status kinds to ClassMap color variants.
 * Use for "Open / Closed / Pending / Archived" row labels, deal stages,
 * ticket priorities, etc.
 *
 * Use the default `appearance="ui"` (ClassMap `<Badge>`-based, works with
 * any theme). The `'uppercase-pill'` variant relies on Material-3
 * container tokens that no current theme defines, so it renders without
 * color everywhere — avoid it until its styling is migrated.
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
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 3),
          cm.sp('py', 1),
          'text-[10px] font-black uppercase tracking-widest rounded-full',
          KIND_TO_PILL_CLASSES[kind],
          className,
        )}
      >
        {icon}
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
