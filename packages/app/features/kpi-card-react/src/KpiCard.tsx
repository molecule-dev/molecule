import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

/**
 *
 */
export type KpiTrendDirection = 'up' | 'down' | 'flat'

/**
 * Where (if anywhere) to draw the colored accent bar.
 *
 * The polished flagship apps use a 4px colored bar — sometimes on the
 * left edge (`'left'`), sometimes across the top (`'top'`), and sometimes
 * none at all (`'none'`). Default is `'none'` to preserve back-compat for
 * call sites that don't pass the prop.
 */
export type KpiCardAccentSide = 'left' | 'top' | 'none'

interface KpiCardProps {
  /** Label describing the metric (usually `t('...')`). */
  title: ReactNode
  /** Large primary value — usually a string or formatted number. */
  value: ReactNode
  /** Optional supporting text below the value (e.g. "vs. last week"). */
  subtitle?: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional trend indicator (use `<KpiCardTrend>` for the default shape). */
  trend?: ReactNode
  /** Optional right-side action (menu, info tooltip). */
  action?: ReactNode
  /**
   * Where to draw the 4px colored accent bar. Default `'none'`.
   * - `'left'` — left edge (border-l-4) — used by blog, helpdesk-ticketing.
   * - `'top'` — top edge (border-t-4) — used by crm, project-management.
   * - `'none'` — no accent — bare card.
   */
  accentSide?: KpiCardAccentSide
  /**
   * Tailwind class for the accent bar's color, e.g. `'border-primary'` or
   * `'border-success'`. Defaults to `'border-primary'`. Ignored when
   * `accentSide === 'none'`.
   */
  accentColor?: string
  /**
   * When `true`, renders the title in 10px-uppercase-tracking-widest style
   * matching the polished pattern. Default `false` keeps the older
   * sentence-case look. Pass `true` for new dashboard call sites.
   */
  upperLabel?: boolean
  /**
   * When `true`, uses `font-extrabold` for the value (matches the polished
   * pattern). Default `false` keeps `font-bold`.
   */
  emphasizeValue?: boolean
  /**
   * When `true`, applies a subtle hover lift (`hover:-translate-y-0.5
   * transition-transform`). Polished dashboards use this. Default `false`.
   */
  hoverLift?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Single KPI / metric display card.
 *
 * Layout: `[icon? title  action?] [value] [trend? / subtitle?]`.
 * Apps use this for dashboard metrics, report summaries, and admin
 * overviews.
 *
 * Visual variants follow the polished flagship apps:
 * - blog/helpdesk-ticketing: `accentSide="left"` + `upperLabel` + `emphasizeValue`
 * - crm/project-management: `accentSide="top"` + `upperLabel` + `emphasizeValue` + `hoverLift`
 * - personal-finance/online-store: `accentSide="none"` (default)
 *
 * @param root0
 * @param root0.title
 * @param root0.value
 * @param root0.subtitle
 * @param root0.icon
 * @param root0.trend
 * @param root0.action
 * @param root0.accentSide
 * @param root0.accentColor
 * @param root0.upperLabel
 * @param root0.emphasizeValue
 * @param root0.hoverLift
 * @param root0.className
 * @param root0.dataMolId
 */
export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  action,
  accentSide = 'none',
  accentColor = 'border-primary',
  upperLabel = false,
  emphasizeValue = false,
  hoverLift = false,
  className,
  dataMolId,
}: KpiCardProps) {
  const cm = getClassMap()
  const accentClass =
    accentSide === 'left'
      ? cm.cn('border-l-4', accentColor)
      : accentSide === 'top'
        ? cm.cn('border-t-4', accentColor)
        : ''
  const liftClass = hoverLift ? 'hover:-translate-y-0.5 transition-transform' : ''
  return (
    <Card
      className={cm.cn(accentClass, liftClass, className)}
      data-mol-id={dataMolId}
    >
      <div className={cm.stack(3)}>
        <div className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <span
              className={cm.cn(
                upperLabel
                  ? cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest text-on-surface-variant')
                  : cm.cn(cm.textSize('sm'), cm.fontWeight('medium')),
              )}
            >
              {title}
            </span>
          </div>
          {action}
        </div>
        <div
          className={cm.cn(
            cm.textSize('3xl'),
            emphasizeValue ? 'font-extrabold' : cm.fontWeight('bold'),
          )}
        >
          {value}
        </div>
        {(trend || subtitle) && (
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {trend}
            {subtitle && <span className={cm.textSize('sm')}>{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}
