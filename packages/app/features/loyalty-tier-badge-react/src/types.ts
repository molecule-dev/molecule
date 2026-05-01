/**
 * Public types for `<LoyaltyTierBadge>`.
 *
 * @module
 */

/** Standard loyalty tier rungs. */
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

/** Props for {@link LoyaltyTierBadge}. */
export interface LoyaltyTierBadgeProps {
  /** Current tier. */
  tier: LoyaltyTier
  /**
   * Member's current points / nights / qualifying activity in the tier
   * unit. Optional; when present and `nextTierThreshold` is also given the
   * badge renders a progress bar and "X to next tier" readout.
   */
  points?: number
  /**
   * Threshold (in the same unit as `points`) at which the next tier is
   * earned. Combined with `points` to compute progress.
   */
  nextTierThreshold?: number
  /** Override the auto-derived next-tier label (e.g. "Diamond"). */
  nextTierLabel?: string
  /** Override the displayed tier label (defaults to translated tier name). */
  tierLabel?: string
  /** Display size. */
  size?: 'sm' | 'md' | 'lg'
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
