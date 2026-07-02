/**
 * Tests for the planService (PlanService bond implementation).
 */

import { describe, expect, it } from 'vitest'

import {
  appleMonthly,
  appleYearly,
  googleMonthly,
  googleYearly,
  plans,
  registerPlans,
  stripeMonthly,
  stripeYearly,
} from '../plans.js'
import { planService } from '../planService.js'

describe('planService.findPlan', () => {
  it('should find the default plan by empty string key', () => {
    const result = planService.findPlan('')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('')
    expect(result!.title).toBe('Free')
  })

  it('should find stripeMonthly by key', () => {
    const result = planService.findPlan('stripeMonthly')
    expect(result).not.toBeNull()
    expect(result).toBe(stripeMonthly)
  })

  it('should find stripeYearly by key', () => {
    const result = planService.findPlan('stripeYearly')
    expect(result).not.toBeNull()
    expect(result).toBe(stripeYearly)
  })

  it('should find appleMonthly by key', () => {
    const result = planService.findPlan('appleMonthly')
    expect(result).not.toBeNull()
    expect(result).toBe(appleMonthly)
  })

  it('should find appleYearly by key', () => {
    const result = planService.findPlan('appleYearly')
    expect(result).not.toBeNull()
    expect(result).toBe(appleYearly)
  })

  it('should find googleMonthly by key', () => {
    const result = planService.findPlan('googleMonthly')
    expect(result).not.toBeNull()
    expect(result).toBe(googleMonthly)
  })

  it('should find googleYearly by key', () => {
    const result = planService.findPlan('googleYearly')
    expect(result).not.toBeNull()
    expect(result).toBe(googleYearly)
  })

  it('should return null for a nonexistent plan key', () => {
    const result = planService.findPlan('nonexistent')
    expect(result).toBeNull()
  })

  it('should return null for undefined-like keys', () => {
    const result = planService.findPlan('undefined')
    expect(result).toBeNull()
  })

  it('should be case-sensitive', () => {
    const result = planService.findPlan('STRIPEMONTHLY')
    expect(result).toBeNull()
  })
})

describe('planService.findPlanByProductId', () => {
  it('should find stripeMonthly by productId', () => {
    const result = planService.findPlanByProductId(stripeMonthly.platformProductId)
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('stripeMonthly')
  })

  it('should find appleMonthly by productId', () => {
    const result = planService.findPlanByProductId('molecule_monthly_early_adopter')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('appleMonthly')
  })

  it('should find appleYearly by productId', () => {
    const result = planService.findPlanByProductId('molecule_yearly_early_adopter')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('appleYearly')
  })

  it('should find googleMonthly by productId', () => {
    const result = planService.findPlanByProductId('monthly_early_adopter')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('googleMonthly')
  })

  it('should find googleYearly by productId', () => {
    const result = planService.findPlanByProductId('yearly_early_adopter')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('googleYearly')
  })

  it('should return null for a nonexistent productId', () => {
    const result = planService.findPlanByProductId('nonexistent_product')
    expect(result).toBeNull()
  })

  it('should return null for an empty string productId', () => {
    // The default (free) plan's platformProductId is '' — but an EMPTY
    // platform identifier from a provider must never resolve to a plan
    // grant. Matching '' against the free plan was an accident of the old
    // `===` comparison; findPlanByProductId now explicitly rejects empty
    // input and empty platformProductId values.
    const result = planService.findPlanByProductId('')
    expect(result).toBeNull()
  })

  it('should find a plan by a registered platform PRICE id', () => {
    registerPlans({
      customPro: {
        planKey: 'customPro',
        platformKey: 'stripe',
        platformProductId: '',
        platformPriceIds: ['price_custom_pro_monthly'],
        alias: 'monthly',
        period: 'month',
        price: '$12',
        autoRenews: true,
        title: 'Pro',
        titleKey: '',
        description: 'Pro',
        descriptionKey: '',
        capabilities: { premium: true },
      },
    })
    const result = planService.findPlanByProductId('price_custom_pro_monthly')
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('customPro')
    // An empty platformProductId on the registered plan must not match ''.
    expect(planService.findPlanByProductId('')).toBeNull()
    delete plans.customPro
  })
})

describe('planService.getDefaultPlan', () => {
  it('should return the default (free) plan', () => {
    const result = planService.getDefaultPlan()
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('')
    expect(result!.title).toBe('Free')
    expect(result!.capabilities.premium).toBe(false)
  })

  it('should return the same plan as findPlan with empty string', () => {
    const defaultPlan = planService.getDefaultPlan()
    const foundPlan = planService.findPlan('')
    expect(defaultPlan).toBe(foundPlan)
  })
})

describe('planService.getAllPlans', () => {
  it('should return all plans', () => {
    const result = planService.getAllPlans()
    expect(result).toHaveLength(7)
  })

  it('should return an array', () => {
    const result = planService.getAllPlans()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should contain the default plan', () => {
    const result = planService.getAllPlans()
    const defaultPlan = result.find((p) => p.planKey === '')
    expect(defaultPlan).toBeDefined()
  })

  it('should contain all platform plans', () => {
    const result = planService.getAllPlans()
    const planKeys = result.map((p) => p.planKey)
    expect(planKeys).toContain('stripeMonthly')
    expect(planKeys).toContain('stripeYearly')
    expect(planKeys).toContain('appleMonthly')
    expect(planKeys).toContain('appleYearly')
    expect(planKeys).toContain('googleMonthly')
    expect(planKeys).toContain('googleYearly')
  })

  it('should return plans that match the plans record', () => {
    const result = planService.getAllPlans()
    const planValues = Object.values(plans)
    expect(result).toEqual(planValues)
  })
})
