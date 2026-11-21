import { type Component, createMemo, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { computeNps } from './computeNps.js'
import type { NpsBucket, NpsDistributionProps, NpsTier } from './types.js'

/** Map a tier to a semantic color CSS custom-property exposed by every ClassMap bond. */
const TIER_COLOR_VAR: Record<NpsTier, string> = {
  detractor: 'var(--mol-color-error)',
  passive: 'var(--mol-color-warning)',
  promoter: 'var(--mol-color-success)',
}

const BAR_HEIGHT_PX = 14
const BAR_RADIUS_PX = 4

/**
 * Net Promoter Score distribution chart — survey-feedback-tool flagship.
 *
 * Renders an 11-row horizontal bar chart (one row per score 0..10) with
 * detractor / passive / promoter color tiers. Bar widths are scaled
 * relative to the tallest bucket so the busiest score always reaches
 * 100% of the track. Below the bars an optional NPS score line shows
 * the computed score (range -100..100) and total response count.
 *
 * Color tiers and the score line both pull from semantic
 * `var(--mol-color-*)` custom properties, so swapping the ClassMap bond
 * (Tailwind → Bootstrap → …) re-themes the chart automatically.
 *
 * This is the Solid counterpart of `@molecule/app-nps-distribution-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @param props - Component props (see {@link NpsDistributionProps}).
 * @returns The rendered NPS distribution element.
 */
export const NpsDistribution: Component<NpsDistributionProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const result = createMemo(() =>
    computeNps(props.scores, props.detractorMax ?? 6, props.passiveMax ?? 8),
  )
  const maxBucket = createMemo(() =>
    result().buckets.reduce((m, b) => (b.count > m ? b.count : m), 0),
  )
  const showScore = createMemo(() => props.showScore ?? true)

  const tierLabel = (tier: NpsTier): string => {
    if (tier === 'detractor')
      return t('nps-distribution.tier.detractor', {}, { defaultValue: 'Detractor' })
    if (tier === 'passive')
      return t('nps-distribution.tier.passive', {}, { defaultValue: 'Passive' })
    return t('nps-distribution.tier.promoter', {}, { defaultValue: 'Promoter' })
  }

  const ariaLabel = (): string =>
    t(
      'nps-distribution.aria-label',
      { total: String(result().total) },
      { defaultValue: 'NPS distribution chart, {{total}} responses' },
    )
  const rowAria = (bucket: NpsBucket): string =>
    t(
      'nps-distribution.row.aria',
      {
        score: String(bucket.score),
        count: String(bucket.count),
        tier: tierLabel(bucket.tier),
      },
      { defaultValue: 'Score {{score}} ({{tier}}): {{count}}' },
    )
  const scoreLabel = (): string => t('nps-distribution.score.label', {}, { defaultValue: 'NPS' })
  const responsesLabel = (): string =>
    t(
      'nps-distribution.score.responses',
      { total: String(result().total) },
      { defaultValue: '{{total}} responses' },
    )

  const trackStyle = {
    height: `${BAR_HEIGHT_PX}px`,
    'border-radius': `${BAR_RADIUS_PX}px`,
    background: 'var(--mol-color-surface-variant, rgba(127, 127, 127, 0.18))',
    overflow: 'hidden',
    flex: '1',
  }

  const fillStyle = (bucket: NpsBucket): Record<string, string> => {
    const widthPct = maxBucket() === 0 ? 0 : Math.max(0, (bucket.count / maxBucket()) * 100)
    return {
      width: `${widthPct}%`,
      height: '100%',
      background: TIER_COLOR_VAR[bucket.tier],
      'border-radius': `${BAR_RADIUS_PX}px`,
      transition: 'width 200ms ease',
    }
  }

  return (
    <div
      class={cm.cn(cm.stack(2), props.className)}
      role="figure"
      aria-label={ariaLabel()}
      data-mol-id={props.dataMolId}
    >
      <ul class={cm.stack(1)} style={{ 'list-style': 'none', padding: '0px', margin: '0px' }}>
        <For each={result().buckets}>
          {(bucket) => (
            <li
              class={cm.flex({ align: 'center', gap: 'sm' })}
              aria-label={rowAria(bucket)}
              data-nps-score={bucket.score}
              data-nps-tier={bucket.tier}
            >
              <span
                class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                style={{ 'min-width': '1.5rem', 'text-align': 'right' }}
                aria-hidden="true"
              >
                {bucket.score}
              </span>
              <span style={trackStyle} aria-hidden="true">
                <span style={fillStyle(bucket)} />
              </span>
              <span
                class={cm.cn(cm.textSize('sm'))}
                style={{ 'min-width': '2rem' }}
                aria-hidden="true"
              >
                {bucket.count}
              </span>
            </li>
          )}
        </For>
      </ul>
      <Show when={showScore()}>
        <div class={cm.flex({ align: 'baseline', gap: 'sm' })} role="status" aria-live="polite">
          <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{scoreLabel()}</span>
          <span
            class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
            data-nps-score-value="true"
          >
            {result().score}
          </span>
          <span class={cm.cn(cm.textSize('xs'))} style={{ opacity: '0.7' }}>
            {responsesLabel()}
          </span>
        </div>
      </Show>
    </div>
  )
}
