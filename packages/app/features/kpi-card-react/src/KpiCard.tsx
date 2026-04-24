import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

/**
 *
 */
export type KpiTrendDirection = 'up' | 'down' | 'flat'

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
 * @param root0
 * @param root0.title
 * @param root0.value
 * @param root0.subtitle
 * @param root0.icon
 * @param root0.trend
 * @param root0.action
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
  className,
  dataMolId,
}: KpiCardProps) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(3)}>
        <div className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{title}</span>
          </div>
          {action}
        </div>
        <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{value}</div>
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
