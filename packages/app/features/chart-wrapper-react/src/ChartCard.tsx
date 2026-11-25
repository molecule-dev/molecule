import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link ChartCard}. */
export interface ChartCardProps {
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
 * @param props - Component props (see {@link ChartCardProps}).
 */
export function ChartCard({
  title,
  description: descriptionProp,
  actions: actionsProp,
  summary: summaryProp,
  children,
  footer: footerProp,
  minChartHeight = 240,
  className,
  dataMolId,
}: ChartCardProps): JSX.Element {
  const description = slot(descriptionProp)
  const actions = slot(actionsProp)
  const summary = slot(summaryProp)
  const footer = slot(footerProp)
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <Box as="div" className={cm.stack(4)}>
        <Box as="header" className={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
          <Box as="div" className={cm.stack(1 as const)}>
            <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {title}
            </Text>
            {description && (
              <Text as="p" className={cm.textSize('sm')}>
                {description}
              </Text>
            )}
          </Box>
          {actions && (
            <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
              {actions}
            </Box>
          )}
        </Box>
        {summary && (
          <Box as="div" className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
            {summary}
          </Box>
        )}
        <Box as="div" style={{ minHeight: minChartHeight }}>
          {children}
        </Box>
        {footer && <Box as="div">{footer}</Box>}
      </Box>
    </Card>
  )
}
