import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserPlanFields } from '../types.js'

vi.mock('@molecule/api-database', () => {
  return {
    findById: vi.fn<(table: string, id: string) => Promise<UserPlanFields | null>>(),
  }
})

let cacheModule: typeof import('../cache.js')
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
})
