/**
 * Solid directional ▲/▼ + delta chip — the counterpart of
 * `@molecule/app-hero-metric-card-react`'s `HeroMetricTrendChip`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { HeroMetricTrendChipProps } from './types.js'

/**
 * Compact trend indicator rendered below the hero value.
 *
 * Shows a directional arrow (▲ / ▼) followed by the caller-provided
 * delta string. The arrow's `aria-label` is localized via
 * `@molecule/app-i18n` so screen readers announce "Trending up" or
 * "Trending down" rather than the bare glyph.
 *
 * @param props - Component props (see {@link HeroMetricTrendChipProps}).
 * @returns The rendered trend chip.
 */
export const HeroMetricTrendChip: Component<HeroMetricTrendChipProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const arrow = (): string => (props.trend.direction === 'up' ? '▲' : '▼')
  const label = (): string =>
    props.trend.direction === 'up'
      ? t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
      : t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' })

  return (
    <span
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        props.className,
      )}
    >
      <span aria-label={label()} role="img">
        {arrow()}
      </span>
      <span>{props.trend.delta}</span>
    </span>
  )
}
