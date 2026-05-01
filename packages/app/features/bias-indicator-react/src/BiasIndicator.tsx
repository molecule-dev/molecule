import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Reliability tier — drives the colour + label of the optional dot/chip.
 * Mapped from a 0..1 reliability score by `reliabilityToTier`.
 */
export type ReliabilityTier = 'high' | 'medium' | 'low' | 'disputed'

/**
 * Bias bucket — drives the bias-marker hue and the screen-reader label.
 * Derived from a -1..1 bias scalar by `biasToBucket`.
 */
export type BiasBucket = 'far-left' | 'left' | 'center' | 'right' | 'far-right'

/** Props for `<BiasIndicator>`. */
export interface BiasIndicatorProps {
  /**
   * Bias scalar from `-1` (far left) through `0` (center) to `+1`
   * (far right). Values are clamped before rendering.
   */
  bias: number
  /**
   * Optional source-credibility / reliability score from `0` (lowest /
   * disputed) to `1` (highest). When omitted, no reliability indicator
   * is rendered.
   */
  reliability?: number
  /**
   * Compact variant collapses the scale to a single coloured dot —
   * useful for dense lists. Defaults to `false`.
   */
  compact?: boolean
  /** Optional source name (e.g. `'Reuters'`). Renders as a small caption. */
  sourceLabel?: ReactNode
  /** Extra classes to merge onto the root element. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}

/**
 * Clamp a number into the inclusive `[min, max]` range.
 *
 * @param value - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Map a `-1..1` bias scalar into a coarse five-bucket label used for
 * accessibility and colouring. Boundaries: `<= -0.6` far-left,
 * `<= -0.2` left, `< 0.2` center, `< 0.6` right, otherwise far-right.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The bias bucket.
 */
export function biasToBucket(bias: number): BiasBucket {
  const b = clamp(bias, -1, 1)
  if (b <= -0.6) return 'far-left'
  if (b <= -0.2) return 'left'
  if (b < 0.2) return 'center'
  if (b < 0.6) return 'right'
  return 'far-right'
}

/**
 * Map a `0..1` reliability score into a four-tier label. Boundaries:
 * `>= 0.75` high, `>= 0.5` medium, `>= 0.25` low, otherwise disputed.
 *
 * @param reliability - Reliability scalar (clamped to `[0, 1]` first).
 * @returns The reliability tier.
 */
export function reliabilityToTier(reliability: number): ReliabilityTier {
  const r = clamp(reliability, 0, 1)
  if (r >= 0.75) return 'high'
  if (r >= 0.5) return 'medium'
  if (r >= 0.25) return 'low'
  return 'disputed'
}

/**
 * Convert a `-1..1` bias value into a `0..100` percent offset for
 * absolute positioning along the scale track.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The percent offset from the left edge of the track.
 */
export function biasToPercent(bias: number): number {
  return ((clamp(bias, -1, 1) + 1) / 2) * 100
}

/**
 * Resolve the marker colour for a given bias bucket. Uses semantic CSS
 * custom properties so swapping themes / styling libraries does not
 * require touching this component.
 *
 * @param bucket - Bias bucket.
 * @returns A `var(--…)` CSS color string.
 */
export function bucketColor(bucket: BiasBucket): string {
  switch (bucket) {
    case 'far-left':
      return 'var(--color-info, #2563eb)'
    case 'left':
      return 'var(--color-info-light, #60a5fa)'
    case 'center':
      return 'var(--color-foreground-secondary, #6b7280)'
    case 'right':
      return 'var(--color-warning-light, #fbbf24)'
    case 'far-right':
      return 'var(--color-error, #dc2626)'
  }
}

/**
 * Resolve the dot colour for a given reliability tier.
 *
 * @param tier - Reliability tier.
 * @returns A `var(--…)` CSS color string.
 */
export function tierColor(tier: ReliabilityTier): string {
  switch (tier) {
    case 'high':
      return 'var(--color-success, #16a34a)'
    case 'medium':
      return 'var(--color-info, #2563eb)'
    case 'low':
      return 'var(--color-warning, #d97706)'
    case 'disputed':
      return 'var(--color-error, #dc2626)'
  }
}

const BIAS_KEY: Record<BiasBucket, string> = {
  'far-left': 'biasIndicator.bias.farLeft',
  left: 'biasIndicator.bias.leftLeaning',
  center: 'biasIndicator.bias.center',
  right: 'biasIndicator.bias.rightLeaning',
  'far-right': 'biasIndicator.bias.farRight',
}

const BIAS_FALLBACK: Record<BiasBucket, string> = {
  'far-left': 'Far left',
  left: 'Left-leaning',
  center: 'Center',
  right: 'Right-leaning',
  'far-right': 'Far right',
}

const TIER_KEY: Record<ReliabilityTier, string> = {
  high: 'biasIndicator.reliability.high',
  medium: 'biasIndicator.reliability.medium',
  low: 'biasIndicator.reliability.low',
  disputed: 'biasIndicator.reliability.disputed',
}

const TIER_FALLBACK: Record<ReliabilityTier, string> = {
  high: 'Reliability: high',
  medium: 'Reliability: medium',
  low: 'Reliability: low',
  disputed: 'Reliability: disputed',
}

/**
 * Political-bias / source-credibility indicator for news article
 * headers. Renders a horizontal `-1..+1` scale with a coloured marker
 * at `bias`, plus an optional reliability dot/chip below. The compact
 * variant collapses to a single coloured dot, suitable for dense
 * article lists.
 *
 * Colours come from semantic CSS custom properties (`--color-info`,
 * `--color-warning`, `--color-error`, `--color-success`,
 * `--color-foreground-secondary`) so per-app theming flows through
 * without code changes.
 *
 * @param props - Component props.
 * @param props.bias - Bias scalar (-1 far left … +1 far right).
 * @param props.reliability - Optional 0..1 reliability score.
 * @param props.compact - Render only the coloured dot.
 * @param props.sourceLabel - Optional source caption.
 * @param props.className - Extra classes.
 * @param props.dataMolId - `data-mol-id` for AI / E2E selectors.
 * @returns The rendered indicator.
 */
export function BiasIndicator({
  bias,
  reliability,
  compact = false,
  sourceLabel,
  className,
  dataMolId,
}: BiasIndicatorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const bucket = biasToBucket(bias)
  const biasLabel = t(BIAS_KEY[bucket], {}, { defaultValue: BIAS_FALLBACK[bucket] })
  const tier = reliability !== undefined ? reliabilityToTier(reliability) : null
  const tierLabel = tier ? t(TIER_KEY[tier], {}, { defaultValue: TIER_FALLBACK[tier] }) : null
  const color = bucketColor(bucket)

  if (compact) {
    return (
      <span
        role="img"
        aria-label={tierLabel ? `${biasLabel} — ${tierLabel}` : biasLabel}
        data-mol-id={dataMolId ?? 'bias-indicator'}
        data-bias-bucket={bucket}
        data-reliability-tier={tier ?? undefined}
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
      >
        <span
          aria-hidden
          className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)}
          style={{ background: color }}
        />
        {sourceLabel !== undefined && (
          <span className={cm.cn(cm.textSize('xs'), cm.textMuted)}>{sourceLabel}</span>
        )}
      </span>
    )
  }

  const percent = biasToPercent(bias)

  return (
    <div
      data-mol-id={dataMolId ?? 'bias-indicator'}
      data-bias-bucket={bucket}
      data-reliability-tier={tier ?? undefined}
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), className)}
    >
      {sourceLabel !== undefined && (
        <span
          data-mol-id="bias-indicator-source"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
        >
          {sourceLabel}
        </span>
      )}
      <div
        role="img"
        aria-label={biasLabel}
        data-mol-id="bias-indicator-scale"
        className={cm.cn(cm.position('relative'), cm.h(2))}
        style={{
          width: '100%',
          minWidth: '80px',
          borderRadius: 999,
          background:
            'linear-gradient(to right, var(--color-info, #2563eb) 0%, var(--color-info-light, #60a5fa) 25%, var(--color-foreground-secondary, #9ca3af) 50%, var(--color-warning-light, #fbbf24) 75%, var(--color-error, #dc2626) 100%)',
          opacity: 0.45,
        }}
      >
        <span
          data-mol-id="bias-indicator-marker"
          aria-hidden
          className={cm.cn(cm.position('absolute'), cm.roundedFull)}
          style={{
            left: `${percent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            background: color,
            border: '2px solid var(--color-surface, #ffffff)',
            boxShadow: '0 0 0 1px var(--color-border, rgba(0,0,0,0.15))',
          }}
        />
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'xs' }))}>
        <span data-mol-id="bias-indicator-bias-label" className={cm.cn(cm.textSize('xs'))}>
          {biasLabel}
        </span>
        {tier && tierLabel && (
          <span
            data-mol-id="bias-indicator-reliability"
            data-reliability-tier={tier}
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'))}
          >
            <span
              aria-hidden
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)}
              style={{ background: tierColor(tier) }}
            />
            <span>{tierLabel}</span>
          </span>
        )}
      </div>
    </div>
  )
}
