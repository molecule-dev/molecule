/**
 * Tests for the `defineTiers()` helper.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { defineTiers } from '../tiers.js'
import type { TierDef } from '../types.js'

interface SampleLimits extends Record<string, unknown> {
  maxProjects: number
  advanced: boolean
}

const sampleTiers: ReadonlyArray<TierDef<SampleLimits>> = [
  {
    id: 'free',
    name: 'Free',
    features: ['1 project'],
    priceMonthly: 0,
    limits: { maxProjects: 1, advanced: false },
  },
  {
    id: 'pro_monthly',
    name: 'Pro (Monthly)',
    features: ['Unlimited projects', 'Priority support'],
    priceMonthly: 1200,
    stripePriceId: 'price_pro_monthly',
    limits: { maxProjects: 999, advanced: true },
  },
  {
    id: 'pro_yearly',
    name: 'Pro (Yearly)',
    features: ['Unlimited projects', 'Priority support', 'Save 20%'],
    priceYearly: 12000,
    stripePriceId: 'price_pro_yearly',
    limits: { maxProjects: 999, advanced: true },
  },
]

describe('defineTiers', () => {
  it('throws when given an empty tier list', () => {
    expect(() => defineTiers([])).toThrow(/at least one tier/)
  })

  it('throws when ids are duplicated', () => {
    expect(() =>
      defineTiers([
        { id: 'free', name: 'Free', features: [] },
        { id: 'free', name: 'Free II', features: [] },
      ]),
    ).toThrow(/duplicate tier id "free"/)
  })

  describe('getPricingTiers', () => {
    it('returns all tiers in declaration order', () => {
      const accessors = defineTiers(sampleTiers)
      const result = accessors.getPricingTiers()
      expect(result).toHaveLength(3)
      expect(result.map((tier) => tier.id)).toEqual(['free', 'pro_monthly', 'pro_yearly'])
    })

    it('returns a frozen array', () => {
      const accessors = defineTiers(sampleTiers)
      const result = accessors.getPricingTiers()
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('getTierById', () => {
    it('returns the matching tier', () => {
      const accessors = defineTiers(sampleTiers)
      const tier = accessors.getTierById('pro_monthly')
      expect(tier?.name).toBe('Pro (Monthly)')
      expect(tier?.stripePriceId).toBe('price_pro_monthly')
    })

    it('returns undefined for unknown ids', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.getTierById('does_not_exist')).toBeUndefined()
    })
  })

  describe('requireTier', () => {
    it('returns the matching tier', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.requireTier('free').id).toBe('free')
    })

    it('throws on unknown ids', () => {
      const accessors = defineTiers(sampleTiers)
      expect(() => accessors.requireTier('does_not_exist')).toThrow(
        /unknown tier id "does_not_exist"/,
      )
    })
  })

  describe('tierAtLeast', () => {
    it('returns true for the same tier', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.tierAtLeast('pro_monthly', 'pro_monthly')).toBe(true)
    })

    it('returns true when tierId is later than minimumId', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.tierAtLeast('pro_yearly', 'free')).toBe(true)
      expect(accessors.tierAtLeast('pro_monthly', 'free')).toBe(true)
    })

    it('returns false when tierId is below minimumId', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.tierAtLeast('free', 'pro_monthly')).toBe(false)
    })

    it('returns false for unknown ids', () => {
      const accessors = defineTiers(sampleTiers)
      expect(accessors.tierAtLeast('unknown', 'free')).toBe(false)
      expect(accessors.tierAtLeast('free', 'unknown')).toBe(false)
    })
  })

  it('preserves limits typing through the accessors', () => {
    const accessors = defineTiers<SampleLimits>(sampleTiers)
    const tier = accessors.requireTier('pro_yearly')
    expect(tier.limits?.maxProjects).toBe(999)
    expect(tier.limits?.advanced).toBe(true)
  })
})
