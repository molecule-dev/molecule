<!--
  GpaCard: the Svelte counterpart of `@molecule/app-gradebook-react`'s
  `GpaCard` — hero card displaying the user's GPA: large primary value, "out of"
  caption, and optional trend chip. Same props (React names), same ClassMap
  tokens, same DOM for the same input. The `trendLabel` node prop is a snippet,
  or plain text.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { GpaCardProps } from './types.js'
  import { defaultGpaMax, formatGpa } from './utilities.js'

  let { gpa, scale, max, trend, trendLabel, className }: GpaCardProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  /** React's `typeof max === 'number' && max > 0 ? max : defaultGpaMax(scale)`. */
  const ceiling = $derived(typeof max === 'number' && max > 0 ? max : defaultGpaMax(scale))
  const formatted = $derived(formatGpa(gpa, scale))
  const formattedMax = $derived(formatGpa(ceiling, scale))

  const titleText = $derived(t('gradebook.gpa.title', {}, { defaultValue: 'GPA' }))
  const outOfText = $derived(
    t('gradebook.gpa.outOf', { max: formattedMax }, { defaultValue: 'out of {{max}}' }),
  )

  /** The trend chip's translation key, or null when no known trend is set. */
  const trendKey = $derived(
    trend === 'up'
      ? 'gradebook.gpa.trend.up'
      : trend === 'down'
        ? 'gradebook.gpa.trend.down'
        : trend === 'flat'
          ? 'gradebook.gpa.trend.flat'
          : null,
  )
  const trendDefault = $derived(
    trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Steady',
  )
  const trendText = $derived(trendKey ? t(trendKey, {}, { defaultValue: trendDefault }) : null)
  const trendGlyph = $derived(trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→')
</script>

<Card {className}>
  <div class={cm.cn(cm.stack(2))} data-mol-id="gpa-card" role="region" aria-label={titleText}>
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))} data-mol-id="gpa-card-title"
      >{titleText}</span
    >
    <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
      <span class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))} data-mol-id="gpa-card-value"
        >{formatted}</span
      >
      <span class={cm.textSize('sm')} data-mol-id="gpa-card-out-of">{outOfText}</span>
    </div>
    {#if trendText}
      <div
        class={cm.flex({ align: 'center', gap: 'sm' })}
        data-mol-id="gpa-card-trend"
        data-trend={trend}
      >
        <span aria-hidden="true">{trendGlyph}</span>
        <span class={cm.textSize('xs')} data-mol-id="gpa-card-trend-text">{trendText}</span>
        {#if trendLabel}
          <span class={cm.textSize('xs')} data-mol-id="gpa-card-trend-label"
            >{#if typeof trendLabel === 'function'}{@render trendLabel()}{:else}{trendLabel}{/if}</span
          >
        {/if}
      </div>
    {/if}
  </div>
</Card>
