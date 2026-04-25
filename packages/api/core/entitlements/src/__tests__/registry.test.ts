import { describe, expect, it } from 'vitest'

import { defineTiers } from '../registry.js'

interface TestLimits {
  maxThings: number
}

const validOptions = () => ({
  tiers: {
    free: {
      planKey: 'free',
      category: 'free',
      name: 'Free',
      limits: { maxThings: 5 },
    },
    pro: {
      planKey: 'pro',
      category: 'pro',
      name: 'Pro',
      limits: { maxThings: 50 },
    },
    team: {
      planKey: 'team',
      category: 'team',
      name: 'Team',
      limits: { maxThings: 500 },
    },
  } satisfies Record<
    string,
    { planKey: string; category: string; name: string; limits: TestLimits }
  >,
  defaultPlanKey: 'free',
  categoryOrder: ['free', 'pro', 'team'],
})

describe('defineTiers', () => {
  it('returns the configured tier for a known plan key', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    const tier = registry.findTier('pro')

    expect(tier.planKey).toBe('pro')
    expect(tier.limits.maxThings).toBe(50)
  })

  it('returns the default tier for null/undefined plan keys', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    expect(registry.findTier(null).planKey).toBe('free')
    expect(registry.findTier(undefined).planKey).toBe('free')
    expect(registry.findTier('').planKey).toBe('free')
  })

  it('returns the default tier for unrecognized plan keys', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    const tier = registry.findTier('unknown-plan')

    expect(tier.planKey).toBe('free')
  })

  it('exposes the default tier directly', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    expect(registry.getDefaultTier().planKey).toBe('free')
  })

  it('returns all tiers via getAllTiers', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    const all = registry.getAllTiers().map((tier) => tier.planKey)

    expect(all).toHaveLength(3)
    expect(all).toContain('free')
    expect(all).toContain('pro')
    expect(all).toContain('team')
  })

  it('returns category ranks based on categoryOrder', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    expect(registry.getCategoryRank('free')).toBe(0)
    expect(registry.getCategoryRank('pro')).toBe(1)
    expect(registry.getCategoryRank('team')).toBe(2)
    expect(registry.getCategoryRank('missing')).toBeNull()
  })

  it('returns the next category up the upgrade order', () => {
    const registry = defineTiers<TestLimits>(validOptions())

    expect(registry.getNextCategory('free')).toBe('pro')
    expect(registry.getNextCategory('pro')).toBe('team')
    expect(registry.getNextCategory('team')).toBeNull()
    expect(registry.getNextCategory('missing')).toBeNull()
  })

  it('throws when defaultPlanKey is not in tiers', () => {
    expect(() =>
      defineTiers<TestLimits>({
        ...validOptions(),
        defaultPlanKey: 'nope',
      }),
    ).toThrow(/defaultPlanKey/i)
  })

  it('throws when a tier has a category not in categoryOrder', () => {
    const options = validOptions()
    options.tiers.pro = {
      planKey: 'pro',
      category: 'enterprise',
      name: 'Pro',
      limits: { maxThings: 50 },
    }
    expect(() => defineTiers<TestLimits>(options)).toThrow(/categoryOrder/i)
  })
})
