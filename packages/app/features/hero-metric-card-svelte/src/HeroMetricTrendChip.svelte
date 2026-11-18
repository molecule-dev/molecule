<!--
  HeroMetricTrendChip: the Svelte counterpart of
  `@molecule/app-hero-metric-card-react`'s `HeroMetricTrendChip` — a
  directional arrow (▲ / ▼) plus the caller-provided delta, with the arrow's
  `aria-label` localized through `t()`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { HeroMetricTrendChipProps } from './types.js'

  let { trend, className }: HeroMetricTrendChipProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const arrow = $derived(trend.direction === 'up' ? '▲' : '▼')
  const label = $derived(
    trend.direction === 'up'
      ? t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
      : t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' }),
  )
  const chipClass = $derived(
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.textSize('sm'),
      cm.fontWeight('semibold'),
      className,
    ),
  )
</script>

<span class={chipClass}>
  <span aria-label={label} role="img">{arrow}</span>
  <span>{trend.delta}</span>
</span>
