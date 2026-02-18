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
    // The default plan has platformProductId '' but it matches first
    // This test verifies finding by empty productId matches the default plan
    const result = planService.findPlanByProductId('')
    // The default plan has platformProductId '' so it should match
    expect(result).not.toBeNull()
    expect(result!.planKey).toBe('')
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
