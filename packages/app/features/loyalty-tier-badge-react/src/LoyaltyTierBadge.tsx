import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { type BoxStyle, type CSSProperties, getClassMap, type TextStyle } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

import type { LoyaltyTier, LoyaltyTierBadgeProps } from './types.js'

/** Internal tier metadata: glyph color + ordering. */
const TIER_ORDER: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
}

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

const SIZE_PX: Record<NonNullable<LoyaltyTierBadgeProps['size']>, number> = {
  sm: 36,
  md: 56,
  lg: 80,
}

/**
 * Compute progress (0–1) toward the next tier given current points + threshold.
 *
 * @param points - Current points balance.
 * @param threshold - Points needed to reach the next tier.
 * @returns Clamped 0–1 progress ratio.
 */
export function computeProgress(points?: number, threshold?: number): number {
  if (typeof points !== 'number' || typeof threshold !== 'number' || threshold <= 0) return 0
  return Math.max(0, Math.min(1, points / threshold))
}

/**
 * Resolve the next tier name (lowercase) given the current tier. Returns
 * `null` when the member is already at the highest tier.
 *
 * @param tier - Current tier.
 * @returns The next-tier name or `null` if at the top.
 */
export function nextTierOf(tier: LoyaltyTier): LoyaltyTier | null {
  const order = TIER_ORDER[tier]
  const next = (Object.entries(TIER_ORDER) as [LoyaltyTier, number][]).find(
    ([, n]) => n === order + 1,
  )
  return next ? next[0] : null
}

/**
 * Loyalty tier badge — renders a colored glyph + tier label + (optional)
 * "X / Y to next tier" progress bar. Used by hotel-booking, online-store,
 * and travel-booking flagship loyalty programs.
 *
 * Tier glyph colors are always the standard metallic accents (fixed per-tier
 * hex values — theme tokens are not consulted for the glyph); the badge's
 * neutral chrome (glyph border, progress track, secondary text) follows the
 * theme through the ClassMap. Pass `tierLabel` / `nextTierLabel` to override
 * the translated defaults for branded programs (e.g. "Member" / "Elite").
 *
 * @param props - Component props.
 * @returns The rendered tier badge.
 *
 * @example
 * ```tsx
 * <LoyaltyTierBadge
 *   tier="gold"
 *   points={42_000}
 *   nextTierThreshold={75_000}
 * />
 * ```
 */
export function LoyaltyTierBadge({
  tier,
  points,
  nextTierThreshold,
  nextTierLabel,
  tierLabel,
  size = 'md',
  dataMolId,
  className,
}: LoyaltyTierBadgeProps): React.ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const px = SIZE_PX[size]
  const accent = TIER_COLOR[tier]
  const next = nextTierOf(tier)
  const progress = computeProgress(points, nextTierThreshold)
  const showProgress =
    typeof points === 'number' &&
    typeof nextTierThreshold === 'number' &&
    nextTierThreshold > 0 &&
    next !== null

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

  const tierName = tierLabel ?? translatedTierName(tier)

  const nextName = nextTierLabel ?? (next ? translatedTierName(next) : '')

  const remaining = showProgress ? Math.max(0, (nextTierThreshold ?? 0) - (points ?? 0)) : 0

  const wrapperClass = cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)

  // Layout and text paint both renderers apply go in `style`; CSS only a browser
  // draws (a round corner, a gradient, `inline-flex`, a transition) in `webStyle`.
  const glyphStyle: TextStyle = {
    width: px,
    height: px,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontWeight: '700',
    fontSize: Math.round(px * 0.45),
  }
  const glyphWebStyle: CSSProperties = {
    borderRadius: '50%',
    // The tier's metallic accent is data (the tier's identity), not a theme tone.
    background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
    display: 'inline-flex',
  }

  const progressOuter: BoxStyle = {
    position: 'relative',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  }
  const progressInner: BoxStyle = {
    width: `${Math.round(progress * 100)}%`,
    height: '100%',
  }
  const progressInnerWebStyle: CSSProperties = {
    // The fill carries the tier's accent (data).
    background: accent,
    transition: 'width 200ms ease',
  }

  return (
    <Box
      as="div"
      className={wrapperClass}
      role="group"
      data-mol-id={dataMolId ?? 'loyalty-tier-badge'}
      data-tier={tier}
      aria-label={t(
        'loyaltyTierBadge.group',
        { tier: tierName },
        { defaultValue: '{{tier}} tier' },
      )}
    >
      <Text
        as="span"
        aria-hidden
        className={cm.borderAll}
        style={glyphStyle}
        webStyle={glyphWebStyle}
        data-mol-id="loyalty-tier-glyph"
      >
        {tierName.charAt(0)}
      </Text>
      <Box as="div" className={cm.flex({ direction: 'col', gap: 'xs' })} style={{ flex: 1 }}>
        <Text as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {tierName}
        </Text>
        {showProgress ? (
          <>
            <Box
              as="div"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label={t(
                'loyaltyTierBadge.progress',
                { next: nextName },
                { defaultValue: 'Progress to {{next}}' },
              )}
              data-mol-id="loyalty-tier-progress"
              className={cm.surfaceSecondary}
              style={progressOuter}
            >
              <Box as="div" style={progressInner} webStyle={progressInnerWebStyle} />
            </Box>
            <Text
              as="span"
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              data-mol-id="loyalty-tier-progress-label"
            >
              {t(
                'loyaltyTierBadge.remaining',
                { remaining, next: nextName },
                { defaultValue: '{{remaining}} to {{next}}' },
              )}
            </Text>
          </>
        ) : (
          next === null && (
            <Text
              as="span"
              className={cm.cn(cm.textSize('xs'), cm.textMuted)}
              data-mol-id="loyalty-tier-top"
            >
              {t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' })}
            </Text>
          )
        )}
      </Box>
    </Box>
  )
}
