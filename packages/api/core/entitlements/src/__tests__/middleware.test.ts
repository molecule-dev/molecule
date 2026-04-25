import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserPlanFields } from '../types.js'

vi.mock('@molecule/api-database', () => {
  return {
    findById: vi.fn<(table: string, id: string) => Promise<UserPlanFields | null>>(),
  }
})

interface TestLimits {
  maxItems: number
}

let middlewareModule: typeof import('../middleware.js')
let providerModule: typeof import('../provider.js')
let registryModule: typeof import('../registry.js')
let cacheModule: typeof import('../cache.js')
let findByIdMock: ReturnType<typeof vi.fn>

const tierOptions = () => ({
  tiers: {
    anonymous: {
      planKey: 'anonymous',
      category: 'anonymous',
      name: 'Anonymous',
      limits: { maxItems: 1 },
    },
    free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxItems: 5 } },
    pro: { planKey: 'pro', category: 'pro', name: 'Pro', limits: { maxItems: 50 } },
  } satisfies Record<
    string,
    { planKey: string; category: string; name: string; limits: TestLimits }
  >,
  defaultPlanKey: 'free',
  categoryOrder: ['anonymous', 'free', 'pro'],
})

const makeRes = (session?: {
  userId?: string
}): {
  res: Record<string, unknown> & { locals: { session?: { userId?: string } } }
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
} => {
  const status = vi.fn()
  const json = vi.fn()
  const res: Record<string, unknown> & { locals: { session?: { userId?: string } } } = {
    locals: { session },
    status: ((code: number) => {
      status(code)
      return res
    }) as never,
    json: ((body: unknown) => {
      json(body)
      return res
    }) as never,
    set: vi.fn().mockImplementation(() => res),
  }
  return { res, status, json }
}

describe('entitlements middleware', () => {
  beforeEach(async () => {
    vi.resetModules()
    middlewareModule = await import('../middleware.js')
    providerModule = await import('../provider.js')
    registryModule = await import('../registry.js')
    cacheModule = await import('../cache.js')
    cacheModule.clearPlanCache()

    const dbModule = await import('@molecule/api-database')
    findByIdMock = dbModule.findById as unknown as ReturnType<typeof vi.fn>
    findByIdMock.mockReset()

    providerModule.setProvider(registryModule.defineTiers<TestLimits>(tierOptions()))
  })

  describe('requireCategory', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const handler = middlewareModule.requireCategory<TestLimits>('pro')
      const { res, status, json } = makeRes()
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(401)
      expect(json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('allows requests when the user tier matches an allowed category', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })

      const handler = middlewareModule.requireCategory<TestLimits>('pro', 'team')
      const { res, status } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('returns 403 when the user tier is not in the allowed list', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'free' })

      const handler = middlewareModule.requireCategory<TestLimits>('pro')
      const { res, status, json } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requireCategoryAtLeast', () => {
    it('allows requests when user rank meets the threshold', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'pro', planExpiresAt: '2099-01-01T00:00:00Z' })

      const handler = middlewareModule.requireCategoryAtLeast<TestLimits>('free')
      const { res, status } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('blocks requests below the threshold', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'free' })

      const handler = middlewareModule.requireCategoryAtLeast<TestLimits>('pro')
      const { res, status, json } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(403)
      expect(json).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('enforceLimit', () => {
    it('allows the request when current usage is below the tier limit', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'free' })

      const handler = middlewareModule.enforceLimit<TestLimits>({
        limitType: 'maxItems',
        getLimit: (limits) => limits.maxItems,
        getCurrent: async () => 2,
      })
      const { res, status } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(next).toHaveBeenCalled()
      expect(status).not.toHaveBeenCalled()
    })

    it('returns 403 with a structured payload when usage hits the cap', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'free' })

      const handler = middlewareModule.enforceLimit<TestLimits>({
        limitType: 'maxItems',
        getLimit: (limits) => limits.maxItems,
        getCurrent: async () => 5,
      })
      const { res, status, json } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(403)
      const payload = json.mock.calls[0]?.[0] as Record<string, unknown> | undefined
      expect(payload?.limitType).toBe('maxItems')
      expect(payload?.currentLimit).toBe(5)
      expect(payload?.upgradeTier).toBe('pro')
      expect(payload?.upgradedLimit).toBe(50)
      expect(next).not.toHaveBeenCalled()
    })

    it('honours the status override', async () => {
      findByIdMock.mockResolvedValue({ planKey: 'free' })

      const handler = middlewareModule.enforceLimit<TestLimits>({
        limitType: 'maxItems',
        getLimit: (limits) => limits.maxItems,
        getCurrent: async () => 5,
        status: 429,
      })
      const { res, status } = makeRes({ userId: 'user-1' })
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(429)
      expect(next).not.toHaveBeenCalled()
    })

    it('returns 401 when the request is unauthenticated', async () => {
      const handler = middlewareModule.enforceLimit<TestLimits>({
        limitType: 'maxItems',
        getLimit: (limits) => limits.maxItems,
        getCurrent: async () => 0,
      })
      const { res, status } = makeRes()
      const next = vi.fn()

      await handler({}, res as never, next)

      expect(status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
