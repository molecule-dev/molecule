/**
 * Vue directional ▲/▼ + delta chip — the counterpart of
 * `@molecule/app-hero-metric-card-react`'s `HeroMetricTrendChip`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { HeroMetricTrend } from './types.js'

/**
 * Compact trend indicator rendered below the hero value.
 *
 * Shows a directional arrow (▲ / ▼) followed by the caller-provided
 * delta string. The arrow's `aria-label` is localized via
 * `@molecule/app-i18n` so screen readers announce "Trending up" or
 * "Trending down" rather than the bare glyph.
 *
 * @param props - Component props (`trend`, `className`).
 * @returns The trend chip component.
 */
export const HeroMetricTrendChip = defineComponent({
  name: 'HeroMetricTrendChip',
  props: {
    trend: { type: Object as PropType<HeroMetricTrend>, required: true },
    className: String,
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()

    return (): VNode => {
      const arrow = props.trend.direction === 'up' ? '▲' : '▼'
      const label =
        props.trend.direction === 'up'
          ? t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
          : t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' })
      return h(
        'span',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            props.className,
          ),
        },
        [h('span', { 'aria-label': label, role: 'img' }, arrow), h('span', {}, props.trend.delta)],
      )
    }
  },
})
