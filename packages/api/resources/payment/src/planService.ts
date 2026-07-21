import type { Plan, PlanService } from '@molecule/api-payments'

import { plans, registerPlans } from './plans.js'
import type { Plan as LocalPlan } from './types.js'

/**
 * PlanService implementation for the bond system.
 *
 * Provides plan lookup operations that other resources
 * can use through `get('plans')` / `require('plans')`.
 */
export const planService: PlanService = {
  findPlan(planKey: string) {
    return plans[planKey] ?? null
  },

  findPlanByProductId(productId: string) {
    if (!productId) return null
    return (
      Object.values(plans).find(
        (p) =>
          (p.platformProductId !== '' && p.platformProductId === productId) ||
          (p.platformPriceIds?.includes(productId) ?? false),
      ) ?? null
    )
  },

  getDefaultPlan() {
    return plans[''] ?? null
  },

  getAllPlans() {
    return Object.values(plans)
  },

  registerPlans(customPlans: Record<string, Plan>) {
    // Adapt the cross-package core Plan to this resource's narrower local
    // type: alias/period are closed vocabularies here, open strings there —
    // anything unrecognized degrades to '' rather than failing registration.
    const narrowed = Object.fromEntries(
      Object.entries(customPlans).map(([key, plan]): [string, LocalPlan] => {
        const local: LocalPlan = {
          planKey: plan.planKey,
          platformKey: plan.platformKey,
          platformProductId: plan.platformProductId,
          alias: plan.alias === 'monthly' || plan.alias === 'yearly' ? plan.alias : '',
          period: plan.period === 'month' || plan.period === 'year' ? plan.period : '',
          price: plan.price,
          title: plan.title,
          description: plan.description,
          capabilities: { premium: plan.capabilities?.premium === true },
        }
        if (plan.platformPriceIds) local.platformPriceIds = plan.platformPriceIds
        if (plan.autoRenews !== undefined) local.autoRenews = plan.autoRenews
        if (plan.shortDescription) local.shortDescription = plan.shortDescription
        if (plan.highlightedDescription) local.highlightedDescription = plan.highlightedDescription
        return [key, local]
      }),
    )
    registerPlans(narrowed)
  },
}
