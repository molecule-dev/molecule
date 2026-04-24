import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

interface ChartCardProps {
  /** Card heading. */
  title: ReactNode
  /** Optional supporting description. */
  description?: ReactNode
  /** Optional right-aligned actions (range selector, export menu, filter). */
  actions?: ReactNode
  /** Optional KPI summary row shown between header and chart (e.g. "Total: 12,345 +12%"). */
  summary?: ReactNode
  /** Chart content — any rendering driven by `@molecule/app-charts`. */
  children: ReactNode
  /** Optional footer below the chart (legend, source attribution). */
  footer?: ReactNode
  /** Set a minimum chart height so responsive charts don't collapse. */
  minChartHeight?: number
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Uniform chrome around an `@molecule/app-charts` rendering — header +
 * actions + optional summary strip + chart body + optional footer.
 *
 * The chart library itself comes from the `@molecule/app-charts` bond;
 * this package only provides the surrounding container.
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.actions
 * @param root0.summary
 * @param root0.children
 * @param root0.footer
 * @param root0.minChartHeight
 * @param root0.className
 * @param root0.dataMolId
 */
export function ChartCard({
  title,
  description,
  actions,
  summary,
  children,
  footer,
  minChartHeight = 240,
  className,
  dataMolId,
}: ChartCardProps) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(4)}>
        <header className={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
          <div className={cm.stack(1 as const)}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
            {description && <p className={cm.textSize('sm')}>{description}</p>}
          </div>
          {actions && <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
        </header>
        {summary && (
          <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>{summary}</div>
        )}
        <div style={{ minHeight: minChartHeight }}>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    </Card>
  )
}
