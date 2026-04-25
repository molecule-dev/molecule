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

const cache = new Map<string, PlanCacheEntry>()

/** Configuration options for the plan cache. */
export interface PlanCacheOptions {
  /** Cache entry TTL in milliseconds. Defaults to 5 minutes. */
  ttlMs?: number

  /**
   * Max number of cached entries. When exceeded, the oldest insertion-order
   * entry is evicted on the next write. Defaults to 50,000.
   */
  maxEntries?: number
}

/**
 * Reconfigures the plan cache. Existing entries remain; only future
 * insertions and TTL checks observe the new settings.
 *
 * @param options - Optional overrides for TTL and maxEntries.
 */
export const configurePlanCache = (options: PlanCacheOptions = {}): void => {
  if (options.ttlMs != null) ttlMs = options.ttlMs
  if (options.maxEntries != null) maxEntries = options.maxEntries
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
  }

  if (cache.size >= maxEntries) {
    const firstKey = cache.keys().next().value
    if (firstKey != null) cache.delete(firstKey)
  }
  cache.set(userId, { planKey, expiresAt: now + ttlMs })

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
