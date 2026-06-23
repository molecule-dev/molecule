import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as CacheModule from '../cache.js'
import type { UserPlanFields } from '../types.js'

vi.mock('@molecule/api-database', () => {
  return {
    findById: vi.fn<(table: string, id: string) => Promise<UserPlanFields | null>>(),
  }
})

let cacheModule: typeof CacheModule
let findByIdMock: ReturnType<typeof vi.fn>

const setUser = (user: UserPlanFields | null): void => {
  findByIdMock.mockResolvedValue(user)
}

describe('plan cache', () => {
  beforeEach(async () => {
    vi.resetModules()
    cacheModule = await import('../cache.js')
    cacheModule.clearPlanCache()
    cacheModule.configurePlanCache({ ttlMs: 300_000, maxEntries: 50_000 })

    const dbModule = await import('@molecule/api-database')
    findByIdMock = dbModule.findById as unknown as ReturnType<typeof vi.fn>
    findByIdMock.mockReset()
  })

  it('returns the user planKey on cold read', async () => {
    setUser({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })

    const result = await cacheModule.getCachedPlanKey('user-1')

    expect(result).toBe('pro')
    expect(findByIdMock).toHaveBeenCalledTimes(1)
    expect(findByIdMock).toHaveBeenCalledWith('users', 'user-1')
  })

  it('serves the same value from cache without re-querying', async () => {
    setUser({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })

    await cacheModule.getCachedPlanKey('user-1')
    await cacheModule.getCachedPlanKey('user-1')
    await cacheModule.getCachedPlanKey('user-1')

    expect(findByIdMock).toHaveBeenCalledTimes(1)
  })

  it('returns "anonymous" for anonymous users regardless of stored plan', async () => {
    setUser({ planKey: 'pro', isAnonymous: true })

    const result = await cacheModule.getCachedPlanKey('anon-1')

    expect(result).toBe('anonymous')
  })

  it('returns null for expired plans', async () => {
    setUser({ planKey: 'pro', planExpiresAt: '2000-01-01T00:00:00Z' })

    const result = await cacheModule.getCachedPlanKey('user-2')

    expect(result).toBeNull()
  })

  it('demotes exactly at planExpiresAt, not a full TTL later [C6-1]', async () => {
    vi.useFakeTimers()
    try {
      const start = new Date('2099-06-01T00:00:00Z').getTime()
      vi.setSystemTime(start)
      // Paid plan lapses 1 min from now — well inside the 5-min cache TTL.
      const expiresAt = new Date(start + 60_000).toISOString()
      setUser({ planKey: 'pro', planExpiresAt: expiresAt })

      expect(await cacheModule.getCachedPlanKey('user-clamp')).toBe('pro') // warms the cache
      expect(findByIdMock).toHaveBeenCalledTimes(1)

      // Advance past plan expiry but still inside the TTL window.
      vi.setSystemTime(start + 61_000)
      // Pre-fix: the entry's TTL (start+300k) is still warm → stale 'pro' returned, no
      // re-query. Post-fix: the entry was clamped to planExpiresAt → cache miss → re-resolve
      // → lapsed plan demotes to null.
      expect(await cacheModule.getCachedPlanKey('user-clamp')).toBeNull()
      expect(findByIdMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns null for users with no plan', async () => {
    setUser({})

    const result = await cacheModule.getCachedPlanKey('user-3')

    expect(result).toBeNull()
  })

  it('returns null when the user record is missing', async () => {
    setUser(null)

    const result = await cacheModule.getCachedPlanKey('missing')

    expect(result).toBeNull()
  })

  it('respects invalidateCachedPlanKey by re-fetching on next read', async () => {
    setUser({ planKey: 'free' })
    await cacheModule.getCachedPlanKey('user-4')
    expect(findByIdMock).toHaveBeenCalledTimes(1)

    setUser({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })
    cacheModule.invalidateCachedPlanKey('user-4')
    const result = await cacheModule.getCachedPlanKey('user-4')

    expect(result).toBe('pro')
    expect(findByIdMock).toHaveBeenCalledTimes(2)
  })

  it('expires entries after the configured TTL', async () => {
    cacheModule.configurePlanCache({ ttlMs: 10 })
    setUser({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })

    await cacheModule.getCachedPlanKey('user-5')
    await new Promise((resolve) => setTimeout(resolve, 25))
    await cacheModule.getCachedPlanKey('user-5')

    expect(findByIdMock).toHaveBeenCalledTimes(2)
  })

  it('evicts oldest entries when the cache exceeds maxEntries', async () => {
    cacheModule.configurePlanCache({ maxEntries: 3 })

    setUser({ planKey: 'free' })
    await cacheModule.getCachedPlanKey('a')
    await cacheModule.getCachedPlanKey('b')
    await cacheModule.getCachedPlanKey('c')
    expect(cacheModule.planCacheSize()).toBe(3)

    await cacheModule.getCachedPlanKey('d')
    expect(cacheModule.planCacheSize()).toBe(3)
  })

  describe('app-specific effectivePlanKeyResolver hook [C6-1]', () => {
    // The cache only knows the generic expiry rule; app-specific demotions
    // (e.g. an in-app-purchase key with no expiry → free) are injected via the
    // resolver so the hot path and the app's own resolver cannot diverge.
    const demoteIapNoExpiry = (
      planKey: string | null,
      planExpiresAt: string | null | undefined,
    ): string | null => {
      if (!planKey) return null
      if ((planKey.startsWith('apple') || planKey.startsWith('google')) && planExpiresAt == null) {
        return null
      }
      return planKey
    }

    it('demotes an apple/google key with NO expiry to null on the hot path (cache miss + hit)', async () => {
      cacheModule.configurePlanCache({ effectivePlanKeyResolver: demoteIapNoExpiry })
      setUser({ planKey: 'appleMonthly', planExpiresAt: null })

      // Cache miss → resolver demotes the unverified IAP key.
      expect(await cacheModule.getCachedPlanKey('iap-1')).toBeNull()
      // The DEMOTED value is what's cached — a warm hit stays demoted, no re-query.
      expect(await cacheModule.getCachedPlanKey('iap-1')).toBeNull()
      expect(findByIdMock).toHaveBeenCalledTimes(1)
    })

    it('leaves an apple/google key WITH a future expiry intact (verified IAP)', async () => {
      cacheModule.configurePlanCache({ effectivePlanKeyResolver: demoteIapNoExpiry })
      setUser({ planKey: 'googleYearly', planExpiresAt: '2099-01-01T00:00:00Z' })

      expect(await cacheModule.getCachedPlanKey('iap-2')).toBe('googleYearly')
    })

    it('defaults to identity (no demotion) when no resolver is configured', async () => {
      // No configurePlanCache call → an IAP-no-expiry key passes through unchanged.
      setUser({ planKey: 'appleMonthly', planExpiresAt: null })
      expect(await cacheModule.getCachedPlanKey('iap-3')).toBe('appleMonthly')
    })

    it('passing null clears a previously-set resolver back to identity', async () => {
      cacheModule.configurePlanCache({ effectivePlanKeyResolver: demoteIapNoExpiry })
      cacheModule.configurePlanCache({ effectivePlanKeyResolver: null })
      setUser({ planKey: 'appleMonthly', planExpiresAt: null })
      expect(await cacheModule.getCachedPlanKey('iap-4')).toBe('appleMonthly')
    })
  })
})
