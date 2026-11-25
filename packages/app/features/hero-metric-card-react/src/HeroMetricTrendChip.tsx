import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

import type { HeroMetricTrend } from './types.js'

/** Props for {@link HeroMetricTrendChip}. */
export interface HeroMetricTrendChipProps {
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
  const { t } = useTranslation()
  const cm = getClassMap()
  const arrow = trend.direction === 'up' ? '▲' : '▼'
  const label =
    trend.direction === 'up'
      ? t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
      : t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' })
  return (
    <Box
      as="span"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        className,
      )}
    >
      <Text as="span" aria-label={label} role="img">
        {arrow}
      </Text>
      <Text as="span">{trend.delta}</Text>
    </Box>
  )
}
