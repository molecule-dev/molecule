/**
 * Per-process plan-key cache.
 *
 * Resolving a user's effective plan key on every request would saturate the
 * database connection pool under load. The plan cache holds a short-lived
 * mapping from `userId` → effective plan key (with anonymous and expired-plan
 * handling already applied), evicted by TTL and bounded by a max-entries cap.
 *
 * The cache is a module-level singleton — there is one cache per process,
 * which is what production deployments want. Tests should call
 * `clearPlanCache()` between cases to avoid cross-test contamination.
 *
 * @module
 */

import { findById } from '@molecule/api-database'

import type { PlanCacheEntry, UserPlanFields } from './types.js'

const DEFAULT_TTL_MS = 300_000 // 5 minutes
const DEFAULT_MAX_ENTRIES = 50_000

let ttlMs = DEFAULT_TTL_MS
let maxEntries = DEFAULT_MAX_ENTRIES

/**
 * Optional app-specific demotion applied to the freshly-resolved
 * `(planKey, planExpiresAt)` on a cache MISS, before the result is cached.
 * Defaults to identity (no demotion). See {@link EffectivePlanKeyResolver} and
 * {@link configurePlanCache}.
 */
let resolveEffective: EffectivePlanKeyResolver = (planKey) => planKey

const cache = new Map<string, PlanCacheEntry>()

/**
 * App-specific hook that maps a stored `(planKey, planExpiresAt)` pair to the
 * EFFECTIVE plan key — applied by {@link getCachedPlanKey} on every cache miss
 * before the value is cached, so the cached (hot-path) result already reflects
 * the app's plan-key semantics.
 *
 * The cache itself only knows the generic expiry rule (a past `planExpiresAt`
 * demotes to default). Conventions like "an in-app-purchase key with no expiry
 * is unverified → demote to free" are APP-specific (the `apple*`/`google*`
 * prefix set is defined by the app, not this package). Apps inject that rule
 * here so the hot path and the app's own `resolveEffectivePlanKey` cannot
 * diverge — there is one demotion implementation, reused.
 *
 * @param planKey - The user's stored plan key (or `null` when unset).
 * @param planExpiresAt - The user's stored plan expiry, or `null`.
 * @returns The effective plan key (possibly demoted), or `null` for default tier.
 */
export type EffectivePlanKeyResolver = (
  planKey: string | null,
  planExpiresAt: string | null | undefined,
) => string | null

/** Configuration options for the plan cache. */
export interface PlanCacheOptions {
  /** Cache entry TTL in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number

  /**
   * Max number of cached entries. When exceeded, the oldest insertion-order
   * entry is evicted on the next write. Defaults to 50,000.
   */
  maxEntries?: number

  /**
   * App-specific effective-plan-key demotion (see
   * {@link EffectivePlanKeyResolver}). Applied on every cache MISS so the cached
   * hot-path result already reflects the app's plan-key semantics — e.g. an
   * in-app-purchase key with no expiry demoting to free. Defaults to identity.
   * Pass `null` to clear a previously-set resolver back to identity.
   */
  effectivePlanKeyResolver?: EffectivePlanKeyResolver | null
}

/**
 * Reconfigures the plan cache. Existing entries remain; only future
 * insertions and TTL checks observe the new settings.
 *
 * @param options - Optional overrides for TTL, maxEntries, and the
 *   effective-plan-key resolver.
 */
export const configurePlanCache = (options: PlanCacheOptions = {}): void => {
  if (options.ttlMs != null) ttlMs = options.ttlMs
  if (options.maxEntries != null) maxEntries = options.maxEntries
  if (options.effectivePlanKeyResolver !== undefined) {
    resolveEffective = options.effectivePlanKeyResolver ?? ((planKey) => planKey)
  }
}

/**
 * Drops every cached plan-key entry. Intended for tests and graceful
 * shutdown — production code should not need to call this.
 */
export const clearPlanCache = (): void => {
  cache.clear()
}

/**
 * Returns the number of currently cached entries. Mainly useful for tests
 * and operational metrics.
 *
 * @returns Current cache size.
 */
export const planCacheSize = (): number => {
  return cache.size
}

/**
 * Resolve the effective plan key for a user, hitting the cache on warm reads
 * and falling back to a DB lookup on cache miss.
 *
 * The effective plan key:
 * - Returns `'anonymous'` for users flagged as anonymous, regardless of stored plan.
 * - Returns `null` for users whose `planExpiresAt` is in the past — callers
 *   should treat this as the default tier.
 * - Returns the stored plan key otherwise (or `null` if none was stored).
 *
 * @param userId - The user ID to look up.
 * @returns The effective plan key, or `null` for default-tier users.
 */
export const getCachedPlanKey = async (userId: string): Promise<string | null> => {
  const now = Date.now()
  const cached = cache.get(userId)

  if (cached && cached.expiresAt > now) {
    return cached.planKey
  }

  const user = await findById<UserPlanFields>('users', userId)

  let planKey: string | null
  if (user?.isAnonymous) {
    planKey = 'anonymous'
  } else {
    planKey = user?.planKey ?? null
    if (planKey && user?.planExpiresAt) {
      const expiresAt = new Date(user.planExpiresAt).getTime()
      if (Number.isFinite(expiresAt) && expiresAt < now) {
        planKey = null
      }
    }
    // Apply the app-specific effective-plan-key demotion (identity by default).
    // Reuses the app's own `resolveEffectivePlanKey` so the hot path and the
    // app cannot diverge — e.g. an `apple*`/`google*` IAP key with NO expiry is
    // unverified and demotes to free here, exactly as it does off the hot path.
    // (Anonymous keeps its 'anonymous' key — the resolver only sees real plans.)
    planKey = resolveEffective(planKey, user?.planExpiresAt ?? null)
  }

  if (cache.size >= maxEntries) {
    const firstKey = cache.keys().next().value
    if (firstKey != null) cache.delete(firstKey)
  }
  // [C6-1] Cap the cache entry at the plan's actual expiry, not just the flat TTL: without
  // this, a paid plan that lapses inside a warm window keeps returning the elevated planKey
  // (and its higher tier limits) for up to a full TTL after the subscription ended — there
  // is no event-based invalidation at the expiry instant. A finite future planExpiresAt is a
  // deterministic demotion time; clamp to it so the cache demotes exactly when the plan
  // lapses. (Lapsed plans already resolved to null above; anonymous/no-expiry keep the TTL.)
  let expiresAt = now + ttlMs
  if (planKey && planKey !== 'anonymous' && user?.planExpiresAt) {
    const planExpiry = new Date(user.planExpiresAt).getTime()
    if (Number.isFinite(planExpiry) && planExpiry > now) {
      expiresAt = Math.min(expiresAt, planExpiry)
    }
  }
  cache.set(userId, { planKey, expiresAt })

  return planKey
}

/**
 * Invalidate a single user's cached plan-key entry. Call this immediately
 * after writing a new `planKey` / `planExpiresAt` to the user record (e.g.
 * from a webhook handler) so the next request reflects the change without
 * waiting out the TTL.
 *
 * @param userId - The user ID whose cache entry should be evicted.
 */
export const invalidateCachedPlanKey = (userId: string): void => {
  cache.delete(userId)
}

/**
 * Sweep expired entries from the cache. Safe to call from a recurring
 * cleanup interval; idempotent and O(n) in cache size.
 */
export const sweepExpiredPlanCacheEntries = (): void => {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}
