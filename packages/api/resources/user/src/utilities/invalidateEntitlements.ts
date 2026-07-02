import { getLogger } from '@molecule/api-bond'

const logger = getLogger()

/**
 * Invalidates the entitlements plan-key cache for a user after their plan
 * changed (paid upgrade via `verifyPayment`, webhook grant/cancellation via
 * `handlePaymentNotification`, admin `updatePlan`).
 *
 * `@molecule/api-entitlements` caches each user's effective plan key for its
 * TTL (default 5 minutes) on the `getEffectiveTier` hot path. Without this
 * call, a user who just PAID keeps seeing their old (free) tier — and a
 * canceled user keeps premium — until the TTL lapses. The dependency is an
 * OPTIONAL peer: apps that don't use entitlements simply have nothing to
 * invalidate, so the import failure is a documented no-op.
 *
 * @param userId - The user whose cached plan key must be dropped.
 */
export const invalidateEntitlementsCache = async (userId: string): Promise<void> => {
  try {
    const entitlements = await import('@molecule/api-entitlements')
    entitlements.invalidateCachedPlanKey?.(userId)
  } catch (_error) {
    // @molecule/api-entitlements is an optional peer — when the app doesn't
    // use entitlements there is no plan cache to invalidate.
  }
}

/**
 * Fire-and-forget variant of {@link invalidateEntitlementsCache} for call
 * sites that must not await (or fail) the surrounding response on cache
 * maintenance.
 *
 * @param userId - The user whose cached plan key must be dropped.
 */
export const invalidateEntitlementsCacheSafe = (userId: string): void => {
  invalidateEntitlementsCache(userId).catch((error: unknown) => {
    // Never let cache maintenance break a payment path — but a failure here
    // means the user sees a stale tier until the TTL lapses, so leave a trace.
    logger.warn('entitlements cache invalidation failed', { userId, error })
  })
}
