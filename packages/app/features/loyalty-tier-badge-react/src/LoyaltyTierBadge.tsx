import type { CSSProperties } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { LoyaltyTier, LoyaltyTierBadgeProps } from './types.js'

/** Internal tier metadata: glyph color + ordering. */
const TIER_ORDER: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
}

/** Default accent color per tier — overridable by callers via theme tokens. */
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
 * Tier glyph colors fall back to standard metallic accents when no theme
 * tokens are wired; pass `tierLabel` / `nextTierLabel` to override the
 * translated defaults for branded programs (e.g. "Member" / "Elite").
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
}: LoyaltyTierBadgeProps) {
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

  const tierName =
    tierLabel ??
    t(
      `loyaltyTierBadge.tier.${tier}`,
      {},
      {
        defaultValue:
          tier === 'bronze'
            ? 'Bronze'
            : tier === 'silver'
              ? 'Silver'
              : tier === 'gold'
                ? 'Gold'
                : 'Platinum',
      },
    )

  const nextName =
    nextTierLabel ??
    (next
      ? t(
          `loyaltyTierBadge.tier.${next}`,
          {},
          {
            defaultValue: next === 'silver' ? 'Silver' : next === 'gold' ? 'Gold' : 'Platinum',
          },
        )
      : '')

  const remaining = showProgress ? Math.max(0, (nextTierThreshold ?? 0) - (points ?? 0)) : 0

  const wrapperClass = cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)

  const glyphStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
    border: '2px solid var(--mol-color-on-surface, rgba(0,0,0,0.12))',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--mol-color-on-surface, #222)',
    fontWeight: 700,
    fontSize: Math.round(px * 0.45),
  }

  const progressOuter: CSSProperties = {
    position: 'relative',
    height: 6,
    borderRadius: 3,
    background: 'var(--mol-color-surface-variant, rgba(0,0,0,0.08))',
    overflow: 'hidden',
    width: '100%',
  }
  const progressInner: CSSProperties = {
    width: `${Math.round(progress * 100)}%`,
    height: '100%',
    background: accent,
    transition: 'width 200ms ease',
  }

  return (
    <div
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
      <span aria-hidden style={glyphStyle} data-mol-id="loyalty-tier-glyph">
        {tierName.charAt(0)}
      </span>
      <div className={cm.flex({ direction: 'col', gap: 'xs' })} style={{ flex: 1 }}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{tierName}</span>
        {showProgress ? (
          <>
            <div
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
              style={progressOuter}
            >
              <div style={progressInner} />
            </div>
            <span
              className={cm.textSize('xs')}
              data-mol-id="loyalty-tier-progress-label"
              style={{ color: 'var(--mol-color-on-surface-variant, #666)' }}
            >
              {t(
                'loyaltyTierBadge.remaining',
                { remaining, next: nextName },
                { defaultValue: '{{remaining}} to {{next}}' },
              )}
            </span>
          </>
        ) : (
          next === null && (
            <span
              className={cm.textSize('xs')}
              data-mol-id="loyalty-tier-top"
              style={{ color: 'var(--mol-color-on-surface-variant, #666)' }}
            >
              {t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' })}
            </span>
          )
        )}
      </div>
    </div>
  )
}
