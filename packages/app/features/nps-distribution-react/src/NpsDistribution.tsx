import { t } from '@molecule/app-i18n'
import type { CSSProperties } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { computeNps } from './computeNps.js'
import type { NpsDistributionProps, NpsTier } from './types.js'

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
 * @param props - Component props.
 * @returns The rendered NPS distribution element.
 */
export function NpsDistribution({
  scores,
  showScore = true,
  detractorMax = 6,
  passiveMax = 8,
  className,
  dataMolId,
}: NpsDistributionProps) {
  const cm = getClassMap()
  const result = computeNps(scores, detractorMax, passiveMax)
  const maxBucket = result.buckets.reduce((m, b) => (b.count > m ? b.count : m), 0)

  const trackStyle: CSSProperties = {
    height: `${BAR_HEIGHT_PX}px`,
    borderRadius: `${BAR_RADIUS_PX}px`,
    background: 'var(--mol-color-surface-variant, rgba(127, 127, 127, 0.18))',
    overflow: 'hidden',
    flex: 1,
  }

  const tierLabel: Record<NpsTier, string> = {
    detractor: t('nps-distribution.tier.detractor', {}, { defaultValue: 'Detractor' }),
    passive: t('nps-distribution.tier.passive', {}, { defaultValue: 'Passive' }),
    promoter: t('nps-distribution.tier.promoter', {}, { defaultValue: 'Promoter' }),
  }

  const ariaLabel = t(
    'nps-distribution.aria-label',
    { total: String(result.total) },
    { defaultValue: 'NPS distribution chart, {{total}} responses' },
  )
  const scoreLabel = t('nps-distribution.score.label', {}, { defaultValue: 'NPS' })
  const responsesLabel = t(
    'nps-distribution.score.responses',
    { total: String(result.total) },
    { defaultValue: '{{total}} responses' },
  )

  return (
    <div
      className={cm.cn(cm.stack(2), className)}
      role="figure"
      aria-label={ariaLabel}
      data-mol-id={dataMolId}
    >
      <ul className={cm.stack(1)} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {result.buckets.map((bucket) => {
          const widthPct = maxBucket === 0 ? 0 : Math.max(0, (bucket.count / maxBucket) * 100)
          const fillStyle: CSSProperties = {
            width: `${widthPct}%`,
            height: '100%',
            background: TIER_COLOR_VAR[bucket.tier],
            borderRadius: `${BAR_RADIUS_PX}px`,
            transition: 'width 200ms ease',
          }
          const rowAria = t(
            'nps-distribution.row.aria',
            {
              score: String(bucket.score),
              count: String(bucket.count),
              tier: tierLabel[bucket.tier],
            },
            {
              defaultValue: 'Score {{score}} ({{tier}}): {{count}}',
            },
          )
          return (
            <li
              key={bucket.score}
              className={cm.flex({ align: 'center', gap: 'sm' })}
              aria-label={rowAria}
              data-nps-score={bucket.score}
              data-nps-tier={bucket.tier}
            >
              <span
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                style={{ minWidth: '1.5rem', textAlign: 'right' }}
                aria-hidden
              >
                {bucket.score}
              </span>
              <span style={trackStyle} aria-hidden>
                <span style={fillStyle} />
              </span>
              <span className={cm.cn(cm.textSize('sm'))} style={{ minWidth: '2rem' }} aria-hidden>
                {bucket.count}
              </span>
            </li>
          )
        })}
      </ul>
      {showScore ? (
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })} role="status" aria-live="polite">
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{scoreLabel}</span>
          <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))} data-nps-score-value>
            {result.score}
          </span>
          <span className={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
            {responsesLabel}
          </span>
        </div>
      ) : null}
    </div>
  )
}
