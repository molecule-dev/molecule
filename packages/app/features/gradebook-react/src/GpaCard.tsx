import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import type { GpaScale, GpaTrend } from './types.js'
import { defaultGpaMax, formatGpa } from './utilities.js'

/** Props for {@link GpaCard}. */
export interface GpaCardProps {
  /** The numeric GPA value (or percentage when `scale='percentage'`). */
  gpa: number
  /** Which scale `gpa` is expressed on. Drives formatting + the "out of" text. */
  scale: GpaScale
  /** Override the maximum value shown in the "out of" caption. */
  max?: number
  /** Optional trend chip — render up/down/flat with localized label. */
  trend?: GpaTrend
  /** Optional caption rendered below the trend (e.g. "vs. last semester"). */
  trendLabel?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}

/**
 * Hero card displaying the user's GPA — large primary value, "out of"
 * caption, and optional trend chip. Pairs with {@link Gradebook} above /
 * beside the table view.
 *
 * Styling routes through `getClassMap()` and all text routes through `t()`
 * via the companion `@molecule/app-locales-gradebook-react` locale bond.
 *
 * @param props - Component props.
 * @returns The GPA hero card element.
 */
export function GpaCard(props: GpaCardProps) {
  const { gpa, scale, max, trend, trendLabel, className } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const ceiling = typeof max === 'number' && max > 0 ? max : defaultGpaMax(scale)
  const formatted = formatGpa(gpa, scale)
  const formattedMax = formatGpa(ceiling, scale)

  const titleText = t('gradebook.gpa.title', {}, { defaultValue: 'GPA' })
  const outOfText = t(
    'gradebook.gpa.outOf',
    { max: formattedMax },
    { defaultValue: 'out of {{max}}' },
  )

  const trendKey =
    trend === 'up'
      ? 'gradebook.gpa.trend.up'
      : trend === 'down'
        ? 'gradebook.gpa.trend.down'
        : trend === 'flat'
          ? 'gradebook.gpa.trend.flat'
          : null
  const trendDefault =
    trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Steady'
  const trendText = trendKey ? t(trendKey, {}, { defaultValue: trendDefault }) : null
  const trendGlyph = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'

  return (
    <Card className={className}>
      <div
        className={cm.cn(cm.stack(2 as const))}
        data-mol-id="gpa-card"
        role="region"
        aria-label={titleText}
      >
        <span
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          data-mol-id="gpa-card-title"
        >
          {titleText}
        </span>
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
            data-mol-id="gpa-card-value"
          >
            {formatted}
          </span>
          <span className={cm.textSize('sm')} data-mol-id="gpa-card-out-of">
            {outOfText}
          </span>
        </div>
        {trendText && (
          <div
            className={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="gpa-card-trend"
            data-trend={trend}
          >
            <span aria-hidden="true">{trendGlyph}</span>
            <span className={cm.textSize('xs')} data-mol-id="gpa-card-trend-text">
              {trendText}
            </span>
            {trendLabel && (
              <span className={cm.textSize('xs')} data-mol-id="gpa-card-trend-label">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
