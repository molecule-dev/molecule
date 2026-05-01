/**
 * Bronze/Silver/Gold/Platinum loyalty tier badge with optional progress
 * bar to the next tier. Used by hotel-booking, online-store, and
 * travel-booking flagship loyalty programs.
 *
 * @example
 * ```tsx
 * import { LoyaltyTierBadge } from '@molecule/app-loyalty-tier-badge-react'
 *
 * <LoyaltyTierBadge tier="gold" points={42_000} nextTierThreshold={75_000} />
 * ```
 *
 * @module
 */

export * from './LoyaltyTierBadge.js'
export * from './types.js'
