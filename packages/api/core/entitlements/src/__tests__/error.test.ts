import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineTiers } from '../registry.js'

interface TestLimits {
  maxItems: number
}

let buildLimitError: typeof import('../error.js').buildLimitError
let setProvider: typeof import('../provider.js').setProvider

const baseOptions = () => ({
  tiers: {
    anonymous: {
      planKey: 'anonymous',
      category: 'anonymous',
      name: 'Anonymous',
      limits: { maxItems: 1 },
    },
    free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxItems: 5 } },
    pro: { planKey: 'pro', category: 'pro', name: 'Pro', limits: { maxItems: 50 } },
    team: { planKey: 'team', category: 'team', name: 'Team', limits: { maxItems: 500 } },
  } satisfies Record<
    string,
    { planKey: string; category: string; name: string; limits: TestLimits }
  >,
  defaultPlanKey: 'free',
  categoryOrder: ['anonymous', 'free', 'pro', 'team'],
})

describe('buildLimitError', () => {
  beforeEach(async () => {
    vi.resetModules()
    const errorModule = await import('../error.js')
    const providerModule = await import('../provider.js')
    buildLimitError = errorModule.buildLimitError
    setProvider = providerModule.setProvider

    setProvider(defineTiers<TestLimits>(baseOptions()))
  })

  it('builds a payload identifying the limit, current value, and next tier', () => {
    const payload = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'free',
      currentLimit: 5,
      resolveUpgradedLimit: (limits) => limits.maxItems,
    })

    expect(payload.limitType).toBe('maxItems')
    expect(payload.currentLimit).toBe(5)
    expect(payload.upgradedLimit).toBe(50)
    expect(payload.currentTier).toBe('free')
    expect(payload.upgradeTier).toBe('pro')
    expect(payload.requiresSignup).toBe(false)
  })

  it('flags requiresSignup when the user is anonymous', () => {
    const payload = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'anonymous',
      currentLimit: 1,
      resolveUpgradedLimit: (limits) => limits.maxItems,
    })

    expect(payload.requiresSignup).toBe(true)
    expect(payload.upgradeTier).toBe('free')
  })

  it('returns null upgradeTier when already at top of order', () => {
    const payload = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'team',
      currentLimit: 500,
      resolveUpgradedLimit: (limits) => limits.maxItems,
    })

    expect(payload.upgradeTier).toBeNull()
    expect(payload.upgradedLimit).toBeNull()
  })

  it('omits upgradedLimit when no resolver is supplied', () => {
    const payload = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'free',
      currentLimit: 5,
    })

    expect(payload.upgradedLimit).toBeNull()
    expect(payload.upgradeTier).toBe('pro')
  })

  it('includes retryAfter only when supplied', () => {
    const without = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'free',
      currentLimit: 5,
    })
    expect(without.retryAfter).toBeUndefined()

    const withRetry = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'free',
      currentLimit: 5,
      retryAfter: 30,
    })
    expect(withRetry.retryAfter).toBe(30)
  })

  it('honours a custom message override', () => {
    const payload = buildLimitError<TestLimits>({
      limitType: 'maxItems',
      category: 'free',
      currentLimit: 5,
      message: 'You have hit the free plan limit.',
    })

    expect(payload.error).toBe('You have hit the free plan limit.')
  })
})
