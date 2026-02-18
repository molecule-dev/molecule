/**
 * Subscription status utilities for molecule.dev.
 *
 * @module
 */

import type { SubscriptionStatus } from './types.js'

/**
 * Checks whether a subscription status represents an active subscription.
 * Returns `true` for `'active'` and `'trialing'` statuses.
 *
 * @param status - The subscription status to check.
 * @returns `true` if the subscription is active or trialing.
 */
export const isActiveStatus = (status: SubscriptionStatus): boolean => {
  return status === 'active' || status === 'trialing'
}
