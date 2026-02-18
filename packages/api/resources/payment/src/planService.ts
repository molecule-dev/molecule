import type { PlanService } from '@molecule/api-payments'

import { plans } from './plans.js'

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
    return Object.values(plans).find((p) => p.platformProductId === productId) ?? null
  },

  getDefaultPlan() {
    return plans[''] ?? null
  },

  getAllPlans() {
    return Object.values(plans)
  },
}
