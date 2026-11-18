<!--
  KpiCardTrend: the Svelte counterpart of `@molecule/app-kpi-card-react`'s
  `KpiCardTrend` — the arrow glyph and the absolute delta. Same props (React
  names), same DOM for the same input; the direction picks only the glyph, no
  color.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { KpiCardTrendProps, KpiTrendDirection } from './types.js'

  let { delta, direction, suffix = '%', className }: KpiCardTrendProps = $props()

  const cm = $derived(getClassMap())
  const effectiveDirection = $derived<KpiTrendDirection>(
    direction ?? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'),
  )
  const arrow = $derived(
    effectiveDirection === 'up' ? '▲' : effectiveDirection === 'down' ? '▼' : '–',
  )
  const amount = $derived(`${Math.abs(delta)}${suffix}`)
  const trendClass = $derived(
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.textSize('sm'),
      cm.fontWeight('semibold'),
      className,
    ),
  )
</script>

<span class={trendClass}>
  <span aria-hidden="true">{arrow}</span>
  <span>{amount}</span>
</span>
