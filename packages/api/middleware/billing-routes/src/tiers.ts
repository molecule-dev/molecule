/**
 * Pure tier-definition helper for the billing-routes feature.
 *
 * `defineTiers()` accepts a flat array of tier descriptors and returns a
 * read-only set of accessors. It performs minimal validation (unique ids,
 * non-empty list) so misconfiguration surfaces at startup rather than at
 * request time.
 *
 * @module
 */

import type { TierAccessors, TierDef } from './types.js'

/**
 * Builds a `TierAccessors` object from an ordered list of tier definitions.
 *
 * Validates that the list is non-empty and that all `id` values are unique.
 * The declaration order of the array IS the upgrade order — `tierAtLeast`
 * uses index comparison, so list cheaper tiers first.
 *
 * @param tiers - Ordered list of tier definitions, cheapest → most expensive.
 * @returns Read-only accessors keyed off the supplied tier ids.
 * @throws {Error} If `tiers` is empty or any id is duplicated.
 */
export const defineTiers = <TLimits extends Record<string, unknown> = Record<string, unknown>>(
  tiers: ReadonlyArray<TierDef<TLimits>>,
): TierAccessors<TLimits> => {
  if (!tiers.length) {
    throw new Error('defineTiers: at least one tier is required.')
  }

  const byId = new Map<string, TierDef<TLimits>>()
  const orderRanks = new Map<string, number>()

  tiers.forEach((tier, index) => {
    if (byId.has(tier.id)) {
      throw new Error(`defineTiers: duplicate tier id "${tier.id}".`)
    }
    byId.set(tier.id, tier)
    orderRanks.set(tier.id, index)
  })

  const frozen: ReadonlyArray<TierDef<TLimits>> = Object.freeze([...tiers])

  return {
    getPricingTiers(): ReadonlyArray<TierDef<TLimits>> {
      return frozen
    },

    getTierById(id: string): TierDef<TLimits> | undefined {
      return byId.get(id)
    },

    requireTier(id: string): TierDef<TLimits> {
      const tier = byId.get(id)
      if (!tier) {
        throw new Error(`defineTiers: unknown tier id "${id}".`)
      }
      return tier
    },

    tierAtLeast(tierId: string, minimumId: string): boolean {
      const rank = orderRanks.get(tierId)
      const minRank = orderRanks.get(minimumId)
      if (rank == null || minRank == null) return false
      return rank >= minRank
    },
  }
}
