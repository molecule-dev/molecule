/**
 * Tier registry construction.
 *
 * `defineTiers(...)` builds a `TierRegistry` from a flat record of tiers plus
 * a category upgrade order. Apps typically call this once at startup and
 * bond the result via `setProvider(...)`.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'

import type { DefineTiersOptions, Tier, TierRegistry } from './types.js'

/**
 * Constructs a `TierRegistry` from a tier record and category order.
 *
 * Validates that the `defaultPlanKey` exists in the `tiers` record and that
 * every tier's `category` appears in `categoryOrder`. Throws synchronously
 * on misconfiguration so problems surface at startup, not at request time.
 *
 * @param options - The tier set, default plan key, and category upgrade order.
 * @returns A typed tier registry suitable for `setProvider(...)`.
 * @throws {Error} If `defaultPlanKey` is missing from `tiers` or any tier's
 *   category is missing from `categoryOrder`.
 *
 * @example
 * ```typescript
 * interface BlogLimits {
 *   maxPosts: number
 *   maxCommentsPerDay: number
 * }
 *
 * const registry = defineTiers<BlogLimits>({
 *   tiers: {
 *     free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxPosts: 5, maxCommentsPerDay: 50 } },
 *     stripeMonthly: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', limits: { maxPosts: 100, maxCommentsPerDay: 1000 } },
 *   },
 *   defaultPlanKey: 'free',
 *   categoryOrder: ['free', 'pro'],
 * })
 * ```
 */
export const defineTiers = <TLimits = unknown>(
  options: DefineTiersOptions<TLimits>,
): TierRegistry<TLimits> => {
  const { tiers, defaultPlanKey, categoryOrder } = options

  const defaultTier = tiers[defaultPlanKey]
  if (!defaultTier) {
    throw new Error(
      t(
        'entitlements.error.missingDefaultTier',
        { planKey: defaultPlanKey },
        {
          defaultValue: `defineTiers: defaultPlanKey "${defaultPlanKey}" not found in tiers record.`,
        },
      ),
    )
  }

  const orderRanks = new Map<string, number>()
  categoryOrder.forEach((category, index) => {
    orderRanks.set(category, index)
  })

  for (const [planKey, tier] of Object.entries(tiers)) {
    if (!orderRanks.has(tier.category)) {
      throw new Error(
        t(
          'entitlements.error.missingCategory',
          { planKey, category: tier.category },
          {
            defaultValue: `defineTiers: tier "${planKey}" has category "${tier.category}" which is not in categoryOrder.`,
          },
        ),
      )
    }
  }

  const allTiers = Object.values(tiers) as Tier<TLimits>[]

  return {
    findTier(planKey) {
      if (planKey == null) return defaultTier
      const tier = tiers[planKey]
      if (tier) return tier
      return defaultTier
    },

    getDefaultTier() {
      return defaultTier
    },

    getAllTiers() {
      return allTiers
    },

    getCategoryRank(category) {
      const rank = orderRanks.get(category)
      return rank ?? null
    },

    getNextCategory(category) {
      const rank = orderRanks.get(category)
      if (rank == null) return null
      const next = categoryOrder[rank + 1]
      return next ?? null
    },
  }
}
