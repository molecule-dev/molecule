import type React from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { HeroMetricTrend } from './types.js'

interface HeroMetricTrendChipProps {
  /** Direction + pre-formatted delta string. */
  trend: HeroMetricTrend
  /** Extra classes. */
  className?: string
}

/**
 * Compact trend indicator rendered below the hero value.
 *
 * Shows a directional arrow (▲ / ▼) followed by the caller-provided
 * delta string. The arrow's `aria-label` is localized via
 * `@molecule/app-i18n` so screen readers announce "Trending up" or
 * "Trending down" rather than the bare glyph.
 *
 * @param props - Component props.
 * @returns The rendered trend chip element.
 */
export function HeroMetricTrendChip({
  trend,
  className,
}: HeroMetricTrendChipProps): React.ReactElement {
  const cm = getClassMap()
  const arrow = trend.direction === 'up' ? '▲' : '▼'
  const label =
    trend.direction === 'up'
      ? t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
      : t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' })
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        className,
      )}
    >
      <span aria-label={label} role="img">
        {arrow}
      </span>
      <span>{trend.delta}</span>
    </span>
  )
}
