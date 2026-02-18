import { get } from '@molecule/api-bond'
import type { Plan, PlanService } from '@molecule/api-payments'

import type * as types from '../types.js'

/**
 * Extended plan info returned by getPlan, including expiration and renewal status.
 */
interface PlanInfo extends Plan {
  isExpired: boolean
  expiresAt: string | undefined
  autoRenews: boolean | undefined
}

/**
 * Get a user's current plan info.
 * Uses the bonded PlanService if available.
 * @param user - The user props (needs `planKey`, `planExpiresAt`, `planAutoRenews`).
 * @returns The user's plan info with expiration status, or `null` if no `PlanService` is bonded.
 */
export const getPlan = async (user: types.Props): Promise<PlanInfo | Plan | null> => {
  const plans = get<PlanService>('plans')
  if (!plans) return null

  const plan = plans.findPlan(user.planKey || '')

  if (plan) {
    const isExpired = user.planExpiresAt
      ? new Date(user.planExpiresAt).getTime() < Date.now()
      : false

    return {
      ...plan,
      isExpired,
      expiresAt: user.planExpiresAt,
      autoRenews: user.planAutoRenews,
    }
  }

  return plans.getDefaultPlan()
}
