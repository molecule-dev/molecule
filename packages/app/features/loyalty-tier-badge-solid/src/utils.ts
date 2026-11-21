/**
 * Tier metadata and the progress helpers for the Solid loyalty tier badge.
 *
 * Both helpers are pure functions, so the Solid package produces exactly the
 * numbers `@molecule/app-loyalty-tier-badge-react` produces from the same
 * input.
 *
 * @module
 */

import type { LoyaltyTier } from './types.js'

/** Tier ordering, lowest rung first. */
const TIER_ORDER: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
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
