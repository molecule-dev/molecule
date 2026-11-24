/**
 * Solid political-bias / source-credibility indicator.
 *
 * Solid counterpart of `@molecule/app-bias-indicator-react`'s `BiasIndicator` —
 * the same props (React names), the same ClassMap tokens, the same inline
 * styles, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { BiasBucket, BiasIndicatorProps, ReliabilityTier } from './types.js'

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

/** i18n key per bias bucket. */
const BIAS_KEY: Record<BiasBucket, string> = {
  'far-left': 'biasIndicator.bias.farLeft',
  left: 'biasIndicator.bias.leftLeaning',
  center: 'biasIndicator.bias.center',
  right: 'biasIndicator.bias.rightLeaning',
  'far-right': 'biasIndicator.bias.farRight',
}

/** English fallback per bias bucket. */
const BIAS_FALLBACK: Record<BiasBucket, string> = {
  'far-left': 'Far left',
  left: 'Left-leaning',
  center: 'Center',
  right: 'Right-leaning',
  'far-right': 'Far right',
}

/** i18n key per reliability tier. */
const TIER_KEY: Record<ReliabilityTier, string> = {
  high: 'biasIndicator.reliability.high',
  medium: 'biasIndicator.reliability.medium',
  low: 'biasIndicator.reliability.low',
  disputed: 'biasIndicator.reliability.disputed',
}

/** English fallback per reliability tier. */
const TIER_FALLBACK: Record<ReliabilityTier, string> = {
  high: 'Reliability: high',
  medium: 'Reliability: medium',
  low: 'Reliability: low',
  disputed: 'Reliability: disputed',
}

/**
 * The baked-in scale gradient: info → info-light → neutral → warning-light →
 * error, so the track reads left-to-right without any styling library.
 */
const SCALE_GRADIENT =
  'linear-gradient(to right, var(--color-info, #2563eb) 0%, var(--color-info-light, #60a5fa) 25%, var(--color-foreground-secondary, #9ca3af) 50%, var(--color-warning-light, #fbbf24) 75%, var(--color-error, #dc2626) 100%)'

/**
 * Political-bias / source-credibility indicator for news article headers.
 * Renders a horizontal `-1..+1` scale with a coloured marker at `bias`, plus
 * an optional reliability dot/chip below. The compact variant collapses to a
 * single coloured dot, suitable for dense article lists.
 *
 * Colours come from semantic CSS custom properties (`--color-info`,
 * `--color-warning`, `--color-error`, `--color-success`,
 * `--color-foreground-secondary`) so per-app theming flows through without
 * code changes.
 *
 * @param props - Component props (see `BiasIndicatorProps`).
 * @returns The rendered indicator.
 */
export const BiasIndicator: Component<BiasIndicatorProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const bucket = (): BiasBucket => biasToBucket(props.bias)
  const biasLabel = (): string =>
    t(BIAS_KEY[bucket()], {}, { defaultValue: BIAS_FALLBACK[bucket()] })
  const tier = (): ReliabilityTier | null =>
    props.reliability !== undefined ? reliabilityToTier(props.reliability) : null
  const tierLabel = (): string | null => {
    const current = tier()
    return current ? t(TIER_KEY[current], {}, { defaultValue: TIER_FALLBACK[current] }) : null
  }
  const dataMolId = (): string => props.dataMolId ?? 'bias-indicator'

  return (
    <Show
      when={props.compact}
      fallback={
        <div
          data-mol-id={dataMolId()}
          data-bias-bucket={bucket()}
          data-reliability-tier={tier() ?? undefined}
          class={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), props.className)}
        >
          <PresentWhileNode node={props.sourceLabel}>
            {(sourceLabel) => (
              <span
                data-mol-id="bias-indicator-source"
                class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              >
                {sourceLabel()}
              </span>
            )}
          </PresentWhileNode>
          <div
            role="img"
            aria-label={biasLabel()}
            data-mol-id="bias-indicator-scale"
            class={cm.cn(cm.position('relative'), cm.h(2))}
            style={{
              width: '100%',
              'min-width': '80px',
              'border-radius': '999px',
              background: SCALE_GRADIENT,
              opacity: 0.45,
            }}
          >
            <span
              data-mol-id="bias-indicator-marker"
              aria-hidden="true"
              class={cm.cn(cm.position('absolute'), cm.roundedFull)}
              style={{
                left: `${biasToPercent(props.bias)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '12px',
                height: '12px',
                background: bucketColor(bucket()),
                border: '2px solid var(--color-surface, #ffffff)',
                'box-shadow': '0 0 0 1px var(--color-border, rgba(0,0,0,0.15))',
              }}
            />
          </div>
          <div class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'xs' }))}>
            <span data-mol-id="bias-indicator-bias-label" class={cm.cn(cm.textSize('xs'))}>
              {biasLabel()}
            </span>
            <Show when={tier()} keyed>
              {(current) => (
                <span
                  data-mol-id="bias-indicator-reliability"
                  data-reliability-tier={current}
                  class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'))}
                >
                  <span
                    aria-hidden="true"
                    class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)}
                    style={{ background: tierColor(current) }}
                  />
                  <span>{t(TIER_KEY[current], {}, { defaultValue: TIER_FALLBACK[current] })}</span>
                </span>
              )}
            </Show>
          </div>
        </div>
      }
    >
      <span
        role="img"
        aria-label={tierLabel() ? `${biasLabel()} — ${tierLabel()}` : biasLabel()}
        data-mol-id={dataMolId()}
        data-bias-bucket={bucket()}
        data-reliability-tier={tier() ?? undefined}
        class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}
      >
        <span
          aria-hidden="true"
          class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)}
          style={{ background: bucketColor(bucket()) }}
        />
        <PresentWhileNode node={props.sourceLabel}>
          {(sourceLabel) => (
            <span class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{sourceLabel()}</span>
          )}
        </PresentWhileNode>
      </span>
    </Show>
  )
}
