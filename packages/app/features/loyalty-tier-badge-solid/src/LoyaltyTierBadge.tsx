/**
 * Solid Bronze/Silver/Gold/Platinum loyalty tier badge with optional progress
 * bar to the next tier.
 *
 * Solid counterpart of `@molecule/app-loyalty-tier-badge-react`'s
 * `LoyaltyTierBadge` — the same props (React names), the same ClassMap
 * tokens, the same inline styles and the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { LoyaltyTier, LoyaltyTierBadgeProps } from './types.js'
import { computeProgress, nextTierOf } from './utils.js'

/**
 * Accent color per tier — the metallic color IS the tier's identity (data), so
 * it never follows the theme; the badge's neutral chrome comes from the ClassMap.
 */
const TIER_COLOR: Record<LoyaltyTier, string> = {
  bronze: '#b87333',
  silver: '#c0c0c0',
  gold: '#d4af37',
  platinum: '#e5e4e2',
}

/** The glyph's pixel size per `size` prop. */
const SIZE_PX: Record<NonNullable<LoyaltyTierBadgeProps['size']>, number> = {
  sm: 36,
  md: 56,
  lg: 80,
}

/**
 * Loyalty tier badge — renders a colored glyph + tier label + (optional)
 * "X / Y to next tier" progress bar.
 *
 * Tier glyph colors are always the standard metallic accents (fixed per-tier
 * hex values — theme tokens are not consulted for the glyph); pass
 * `tierLabel` / `nextTierLabel` to override the translated defaults for
 * branded programs (e.g. "Member" / "Elite").
 *
 * @param props - Component props (see {@link LoyaltyTierBadgeProps}).
 * @returns The rendered tier badge.
 */
export const LoyaltyTierBadge: Component<LoyaltyTierBadgeProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const px = (): number => SIZE_PX[props.size ?? 'md']
  const next = (): LoyaltyTier | null => nextTierOf(props.tier)
  const progress = (): number => computeProgress(props.points, props.nextTierThreshold)
  const showProgress = (): boolean =>
    typeof props.points === 'number' &&
    typeof props.nextTierThreshold === 'number' &&
    props.nextTierThreshold > 0 &&
    next() !== null

  /**
   * The translated name of a tier rung. Every rung is a literal key (the
   * locale bond owns `loyaltyTierBadge.tier.<rung>`), so the i18n gate can
   * check each one exists in the bond.
   *
   * @param rung - The tier to name.
   * @returns The tier's translated name.
   */
  const translatedTierName = (rung: LoyaltyTier): string => {
    switch (rung) {
      case 'bronze':
        return t('loyaltyTierBadge.tier.bronze', {}, { defaultValue: 'Bronze' })
      case 'silver':
        return t('loyaltyTierBadge.tier.silver', {}, { defaultValue: 'Silver' })
      case 'gold':
        return t('loyaltyTierBadge.tier.gold', {}, { defaultValue: 'Gold' })
      case 'platinum':
        return t('loyaltyTierBadge.tier.platinum', {}, { defaultValue: 'Platinum' })
    }
  }

  const tierName = (): string => props.tierLabel ?? translatedTierName(props.tier)

  const nextName = (): string => {
    const upcoming = next()
    return props.nextTierLabel ?? (upcoming ? translatedTierName(upcoming) : '')
  }

  const remaining = (): number =>
    showProgress() ? Math.max(0, (props.nextTierThreshold ?? 0) - (props.points ?? 0)) : 0

  const glyphStyle = (): JSX.CSSProperties => {
    const size = px()
    const accent = TIER_COLOR[props.tier]
    return {
      width: `${size}px`,
      height: `${size}px`,
      'border-radius': '50%',
      // The tier's metallic accent is data (the tier's identity), not a theme tone.
      background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-shrink': '0',
      'font-weight': '700',
      'font-size': `${Math.round(size * 0.45)}px`,
    }
  }

  const progressOuter = (): JSX.CSSProperties => ({
    position: 'relative',
    height: '6px',
    'border-radius': '3px',
    overflow: 'hidden',
    width: '100%',
  })

  const progressInner = (): JSX.CSSProperties => ({
    width: `${Math.round(progress() * 100)}%`,
    height: '100%',
    // The fill carries the tier's accent (data).
    background: TIER_COLOR[props.tier],
    transition: 'width 200ms ease',
  })

  return (
    <div
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}
      role="group"
      data-mol-id={props.dataMolId ?? 'loyalty-tier-badge'}
      data-tier={props.tier}
      aria-label={t(
        'loyaltyTierBadge.group',
        { tier: tierName() },
        { defaultValue: '{{tier}} tier' },
      )}
    >
      <span
        aria-hidden="true"
        class={cm.borderAll}
        style={glyphStyle()}
        data-mol-id="loyalty-tier-glyph"
      >
        {tierName().charAt(0)}
      </span>
      <div class={cm.flex({ direction: 'col', gap: 'xs' })} style={{ flex: '1 1 0%' }}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{tierName()}</span>
        {showProgress() ? (
          <>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress() * 100)}
              aria-label={t(
                'loyaltyTierBadge.progress',
                { next: nextName() },
                { defaultValue: 'Progress to {{next}}' },
              )}
              data-mol-id="loyalty-tier-progress"
              class={cm.surfaceSecondary}
              style={progressOuter()}
            >
              <div style={progressInner()} />
            </div>
            <span
              class={cm.cn(cm.textSize('xs'), cm.textMuted)}
              data-mol-id="loyalty-tier-progress-label"
            >
              {t(
                'loyaltyTierBadge.remaining',
                { remaining: remaining(), next: nextName() },
                { defaultValue: '{{remaining}} to {{next}}' },
              )}
            </span>
          </>
        ) : (
          next() === null && (
            <span class={cm.cn(cm.textSize('xs'), cm.textMuted)} data-mol-id="loyalty-tier-top">
              {t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' })}
            </span>
          )
        )}
      </div>
    </div>
  )
}
