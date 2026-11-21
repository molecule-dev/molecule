<!--
  NpsDistribution: the Svelte counterpart of
  `@molecule/app-nps-distribution-react`'s `NpsDistribution` — the same props
  (React names), the same ClassMap tokens and the same DOM for the same input.
  11 rows (one per score 0..10) with detractor / passive / promoter color tiers
  and an optional computed NPS score line.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { computeNps } from './computeNps.js'
  import type { NpsDistributionProps, NpsTier } from './types.js'

  /** Map a tier to a semantic color CSS custom-property exposed by every ClassMap bond. */
  const TIER_COLOR_VAR: Record<NpsTier, string> = {
    detractor: 'var(--mol-color-error)',
    passive: 'var(--mol-color-warning)',
    promoter: 'var(--mol-color-success)',
  }

  let {
    scores,
    showScore = true,
    detractorMax = 6,
    passiveMax = 8,
    className,
    dataMolId,
  }: NpsDistributionProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const result = $derived(computeNps(scores, detractorMax, passiveMax))
  const maxBucket = $derived(result.buckets.reduce((m, b) => (b.count > m ? b.count : m), 0))

  const tierLabel = $derived<Record<NpsTier, string>>({
    detractor: t('nps-distribution.tier.detractor', {}, { defaultValue: 'Detractor' }),
    passive: t('nps-distribution.tier.passive', {}, { defaultValue: 'Passive' }),
    promoter: t('nps-distribution.tier.promoter', {}, { defaultValue: 'Promoter' }),
  })
  const ariaLabel = $derived(
    t(
      'nps-distribution.aria-label',
      { total: String(result.total) },
      { defaultValue: 'NPS distribution chart, {{total}} responses' },
    ),
  )
  const scoreLabel = $derived(t('nps-distribution.score.label', {}, { defaultValue: 'NPS' }))
  const responsesLabel = $derived(
    t(
      'nps-distribution.score.responses',
      { total: String(result.total) },
      { defaultValue: '{{total}} responses' },
    ),
  )

  /**
   * The localized aria-label of one row.
   *
   * @param score - The row's score.
   * @param count - The row's response count.
   * @param tier - The row's tier.
   * @returns The translated label.
   */
  const rowAria = (score: number, count: number, tier: NpsTier): string =>
    t(
      'nps-distribution.row.aria',
      { score: String(score), count: String(count), tier: tierLabel[tier] },
      { defaultValue: 'Score {{score}} ({{tier}}): {{count}}' },
    )

  /**
   * The inline style of one row's filled bar.
   *
   * @param count - The row's response count.
   * @param tier - The row's tier.
   * @returns The style attribute text.
   */
  const fillStyle = (count: number, tier: NpsTier): string => {
    const widthPct = maxBucket === 0 ? 0 : Math.max(0, (count / maxBucket) * 100)
    return `background: ${TIER_COLOR_VAR[tier]}; border-radius: 4px; height: 100%; transition: width 200ms ease; width: ${widthPct}%`
  }
</script>

<div
  class={cm.cn(cm.stack(2), className)}
  role="figure"
  aria-label={ariaLabel}
  data-mol-id={dataMolId}
>
  <ul class={cm.stack(1)} style="list-style: none; margin: 0px; padding: 0px">
    {#each result.buckets as bucket (bucket.score)}
      <li
        class={cm.flex({ align: 'center', gap: 'sm' })}
        aria-label={rowAria(bucket.score, bucket.count, bucket.tier)}
        data-nps-score={bucket.score}
        data-nps-tier={bucket.tier}
      >
        <span
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          style="min-width: 1.5rem; text-align: right"
          aria-hidden="true"
        >
          {bucket.score}
        </span>
        <span
          style="background: var(--mol-color-surface-variant, rgba(127, 127, 127, 0.18)); border-radius: 4px; flex: 1 1 0%; height: 14px; overflow: hidden"
          aria-hidden="true"
        >
          <span style={fillStyle(bucket.count, bucket.tier)}></span>
        </span>
        <span class={cm.cn(cm.textSize('sm'))} style="min-width: 2rem" aria-hidden="true">
          {bucket.count}
        </span>
      </li>
    {/each}
  </ul>
  {#if showScore}
    <div class={cm.flex({ align: 'baseline', gap: 'sm' })} role="status" aria-live="polite">
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{scoreLabel}</span>
      <span class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))} data-nps-score-value="true">
        {result.score}
      </span>
      <span class={cm.cn(cm.textSize('xs'))} style="opacity: 0.7">{responsesLabel}</span>
    </div>
  {/if}
</div>
