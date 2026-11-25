import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import type { BoxStyle, WebStyle } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
}: NpsDistributionProps): React.ReactElement {
  const { t } = useTranslation()
  const cm = getClassMap()
  const result = computeNps(scores, detractorMax, passiveMax)
  const maxBucket = result.buckets.reduce((m, b) => (b.count > m ? b.count : m), 0)

  const trackStyle: BoxStyle = {
    height: BAR_HEIGHT_PX,
    borderRadius: BAR_RADIUS_PX,
    overflow: 'hidden',
    flex: 1,
  }
  const trackWebStyle: WebStyle = {
    background: 'var(--mol-color-surface-variant, rgba(127, 127, 127, 0.18))',
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
    <Box
      as="div"
      className={cm.cn(cm.stack(2), className)}
      role="figure"
      aria-label={ariaLabel}
      data-mol-id={dataMolId}
    >
      <Box
        as="ul"
        className={cm.stack(1)}
        style={{ padding: 0, margin: 0 }}
        webStyle={{ listStyle: 'none' }}
      >
        {result.buckets.map((bucket) => {
          const widthPct = maxBucket === 0 ? 0 : Math.max(0, (bucket.count / maxBucket) * 100)
          const fillStyle: BoxStyle = {
            width: `${widthPct}%`,
            height: '100%',
            borderRadius: BAR_RADIUS_PX,
          }
          const fillWebStyle: WebStyle = {
            background: TIER_COLOR_VAR[bucket.tier],
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
            <Box
              as="li"
              key={bucket.score}
              className={cm.flex({ align: 'center', gap: 'sm' })}
              aria-label={rowAria}
              data-nps-score={bucket.score}
              data-nps-tier={bucket.tier}
            >
              <Text
                as="span"
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
                style={{ textAlign: 'right' }}
                webStyle={{ minWidth: '1.5rem' }}
                aria-hidden
              >
                {bucket.score}
              </Text>
              <Box as="span" style={trackStyle} webStyle={trackWebStyle} aria-hidden>
                <Box as="span" style={fillStyle} webStyle={fillWebStyle} />
              </Box>
              <Text
                as="span"
                className={cm.cn(cm.textSize('sm'))}
                webStyle={{ minWidth: '2rem' }}
                aria-hidden
              >
                {bucket.count}
              </Text>
            </Box>
          )
        })}
      </Box>
      {showScore ? (
        <Box
          as="div"
          className={cm.flex({ align: 'baseline', gap: 'sm' })}
          role="status"
          aria-live="polite"
        >
          <Text as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {scoreLabel}
          </Text>
          <Text
            as="span"
            className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}
            data-nps-score-value
          >
            {result.score}
          </Text>
          <Text as="span" className={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
            {responsesLabel}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
