import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-react'

/** Semantic status kind used to select badge color variants. */
export type StatusKind = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
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
   *   styling. Best for apps that customize the `cm.badge()` helper.
   * - `'uppercase-pill'` — verbatim polished-flagship pattern:
   *   `px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full`.
   *   Use this for dashboards / list rows / detail headers in apps that
   *   match the polished visual style (helpdesk-ticketing, crm,
   *   online-store, project-management).
   *
   * The `kind` prop maps to the same semantic colors in both variants.
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
 * The `appearance` prop selects between the ClassMap-helper variant
 * (`'ui'`, default) and the polished-flagship inline pattern
 * (`'uppercase-pill'`). Pass `appearance="uppercase-pill"` in dashboard
 * tables and list rows to match crm/helpdesk-ticketing/online-store.
 *
 * @param root0
 * @param root0.kind
 * @param root0.children
 * @param root0.icon
 * @param root0.appearance
 * @param root0.className
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
