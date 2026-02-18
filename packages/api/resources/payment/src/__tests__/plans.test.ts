/**
 * Tests for the plans definitions.
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
describe('plans record', () => {
  it('should contain exactly 7 plans', () => {
    expect(Object.keys(plans)).toHaveLength(7)
  })

  it('should contain the default plan keyed by empty string', () => {
    expect(plans['']).toBeDefined()
  })

  it('should contain stripeMonthly', () => {
    expect(plans['stripeMonthly']).toBeDefined()
    expect(plans['stripeMonthly']).toBe(stripeMonthly)
  })

  it('should contain stripeYearly', () => {
    expect(plans['stripeYearly']).toBeDefined()
    expect(plans['stripeYearly']).toBe(stripeYearly)
  })

  it('should contain appleMonthly', () => {
    expect(plans['appleMonthly']).toBeDefined()
    expect(plans['appleMonthly']).toBe(appleMonthly)
  })

  it('should contain appleYearly', () => {
    expect(plans['appleYearly']).toBeDefined()
    expect(plans['appleYearly']).toBe(appleYearly)
  })

  it('should contain googleMonthly', () => {
    expect(plans['googleMonthly']).toBeDefined()
    expect(plans['googleMonthly']).toBe(googleMonthly)
  })

  it('should contain googleYearly', () => {
    expect(plans['googleYearly']).toBeDefined()
    expect(plans['googleYearly']).toBe(googleYearly)
  })
})

describe('default plan', () => {
  const defaultPlan = plans['']

  it('should have empty planKey', () => {
    expect(defaultPlan.planKey).toBe('')
  })

  it('should have empty platformKey', () => {
    expect(defaultPlan.platformKey).toBe('')
  })

  it('should have empty platformProductId', () => {
    expect(defaultPlan.platformProductId).toBe('')
  })

  it('should have empty alias', () => {
    expect(defaultPlan.alias).toBe('')
  })

  it('should have empty period', () => {
    expect(defaultPlan.period).toBe('')
  })

  it('should have empty price', () => {
    expect(defaultPlan.price).toBe('')
  })

  it('should have title "Free"', () => {
    expect(defaultPlan.title).toBe('Free')
  })

  it('should have a description', () => {
    expect(defaultPlan.description).toBeTruthy()
    expect(defaultPlan.description).toContain('limited')
  })

  it('should have a shortDescription', () => {
    expect(defaultPlan.shortDescription).toBeTruthy()
  })

  it('should not be premium', () => {
    expect(defaultPlan.capabilities.premium).toBe(false)
  })

  it('should not have autoRenews property', () => {
    expect(defaultPlan.autoRenews).toBeUndefined()
  })
})

describe('stripeMonthly plan', () => {
  it('should have planKey "stripeMonthly"', () => {
    expect(stripeMonthly.planKey).toBe('stripeMonthly')
  })

  it('should have platformKey "stripe"', () => {
    expect(stripeMonthly.platformKey).toBe('stripe')
  })

  it('should have a platformProductId', () => {
    expect(stripeMonthly.platformProductId).toBeTruthy()
  })

  it('should have alias "monthly"', () => {
    expect(stripeMonthly.alias).toBe('monthly')
  })

  it('should have period "month"', () => {
    expect(stripeMonthly.period).toBe('month')
  })

  it('should have a price', () => {
    expect(stripeMonthly.price).toBe('$5')
  })

  it('should auto-renew', () => {
    expect(stripeMonthly.autoRenews).toBe(true)
  })

  it('should have title "Monthly"', () => {
    expect(stripeMonthly.title).toBe('Monthly')
  })

  it('should be premium', () => {
    expect(stripeMonthly.capabilities.premium).toBe(true)
  })
})

describe('stripeYearly plan', () => {
  it('should have planKey "stripeYearly"', () => {
    expect(stripeYearly.planKey).toBe('stripeYearly')
  })

  it('should have platformKey "stripe"', () => {
    expect(stripeYearly.platformKey).toBe('stripe')
  })

  it('should have alias "yearly"', () => {
    expect(stripeYearly.alias).toBe('yearly')
  })

  it('should have period "year"', () => {
    expect(stripeYearly.period).toBe('year')
  })

  it('should have a price', () => {
    expect(stripeYearly.price).toBe('$55')
  })

  it('should auto-renew', () => {
    expect(stripeYearly.autoRenews).toBe(true)
  })

  it('should have title "Yearly"', () => {
    expect(stripeYearly.title).toBe('Yearly')
  })

  it('should be premium', () => {
    expect(stripeYearly.capabilities.premium).toBe(true)
  })

  it('should have highlightedDescription', () => {
    expect(stripeYearly.highlightedDescription).toBeTruthy()
  })
})

describe('appleMonthly plan', () => {
  it('should have planKey "appleMonthly"', () => {
    expect(appleMonthly.planKey).toBe('appleMonthly')
  })

  it('should have platformKey "apple"', () => {
    expect(appleMonthly.platformKey).toBe('apple')
  })

  it('should have platformProductId "molecule_monthly_early_adopter"', () => {
    expect(appleMonthly.platformProductId).toBe('molecule_monthly_early_adopter')
  })

  it('should have alias "monthly"', () => {
    expect(appleMonthly.alias).toBe('monthly')
  })

  it('should have period "month"', () => {
    expect(appleMonthly.period).toBe('month')
  })

  it('should have price "$5.99"', () => {
    expect(appleMonthly.price).toBe('$5.99')
  })

  it('should auto-renew', () => {
    expect(appleMonthly.autoRenews).toBe(true)
  })

  it('should be premium', () => {
    expect(appleMonthly.capabilities.premium).toBe(true)
  })
})

describe('appleYearly plan', () => {
  it('should have planKey "appleYearly"', () => {
    expect(appleYearly.planKey).toBe('appleYearly')
  })

  it('should have platformKey "apple"', () => {
    expect(appleYearly.platformKey).toBe('apple')
  })

  it('should have platformProductId "molecule_yearly_early_adopter"', () => {
    expect(appleYearly.platformProductId).toBe('molecule_yearly_early_adopter')
  })

  it('should have alias "yearly"', () => {
    expect(appleYearly.alias).toBe('yearly')
  })

  it('should have period "year"', () => {
    expect(appleYearly.period).toBe('year')
  })

  it('should have price "$64.99"', () => {
    expect(appleYearly.price).toBe('$64.99')
  })

  it('should auto-renew', () => {
    expect(appleYearly.autoRenews).toBe(true)
  })

  it('should be premium', () => {
    expect(appleYearly.capabilities.premium).toBe(true)
  })

  it('should have highlightedDescription', () => {
    expect(appleYearly.highlightedDescription).toBeTruthy()
  })
})

describe('googleMonthly plan', () => {
  it('should have planKey "googleMonthly"', () => {
    expect(googleMonthly.planKey).toBe('googleMonthly')
  })

  it('should have platformKey "google"', () => {
    expect(googleMonthly.platformKey).toBe('google')
  })

  it('should have platformProductId "monthly_early_adopter"', () => {
    expect(googleMonthly.platformProductId).toBe('monthly_early_adopter')
  })

  it('should have alias "monthly"', () => {
    expect(googleMonthly.alias).toBe('monthly')
  })

  it('should have period "month"', () => {
    expect(googleMonthly.period).toBe('month')
  })

  it('should have price "$5.99"', () => {
    expect(googleMonthly.price).toBe('$5.99')
  })

  it('should auto-renew', () => {
    expect(googleMonthly.autoRenews).toBe(true)
  })

  it('should be premium', () => {
    expect(googleMonthly.capabilities.premium).toBe(true)
  })
})

describe('googleYearly plan', () => {
  it('should have planKey "googleYearly"', () => {
    expect(googleYearly.planKey).toBe('googleYearly')
  })

  it('should have platformKey "google"', () => {
    expect(googleYearly.platformKey).toBe('google')
  })

  it('should have platformProductId "yearly_early_adopter"', () => {
    expect(googleYearly.platformProductId).toBe('yearly_early_adopter')
  })

  it('should have alias "yearly"', () => {
    expect(googleYearly.alias).toBe('yearly')
  })

  it('should have period "year"', () => {
    expect(googleYearly.period).toBe('year')
  })

  it('should have price "$64.99"', () => {
    expect(googleYearly.price).toBe('$64.99')
  })

  it('should auto-renew', () => {
    expect(googleYearly.autoRenews).toBe(true)
  })

  it('should be premium', () => {
    expect(googleYearly.capabilities.premium).toBe(true)
  })

  it('should have highlightedDescription', () => {
    expect(googleYearly.highlightedDescription).toBeTruthy()
  })
})

describe('plan structure consistency', () => {
  const allPlans = Object.values(plans)

  it('every plan should have required fields', () => {
    for (const plan of allPlans) {
      expect(plan.planKey).toBeDefined()
      expect(plan.platformKey).toBeDefined()
      expect(plan.platformProductId).toBeDefined()
      expect(plan.alias).toBeDefined()
      expect(plan.period).toBeDefined()
      expect(plan.price).toBeDefined()
      expect(plan.title).toBeDefined()
      expect(plan.description).toBeDefined()
      expect(plan.capabilities).toBeDefined()
      expect(typeof plan.capabilities.premium).toBe('boolean')
    }
  })

  it('premium plans should have autoRenews set to true', () => {
    const premiumPlans = allPlans.filter((p) => p.capabilities.premium)
    for (const plan of premiumPlans) {
      expect(plan.autoRenews).toBe(true)
    }
  })

  it('each plan should belong to a valid platform', () => {
    const validPlatforms = ['', 'stripe', 'apple', 'google']
    for (const plan of allPlans) {
      expect(validPlatforms).toContain(plan.platformKey)
    }
  })

  it('each plan alias should be valid', () => {
    const validAliases = ['', 'monthly', 'yearly']
    for (const plan of allPlans) {
      expect(validAliases).toContain(plan.alias)
    }
  })

  it('each plan period should be valid', () => {
    const validPeriods = ['', 'month', 'year']
    for (const plan of allPlans) {
      expect(validPeriods).toContain(plan.period)
    }
  })

  it('stripe plans should have platformKey "stripe"', () => {
    expect(stripeMonthly.platformKey).toBe('stripe')
    expect(stripeYearly.platformKey).toBe('stripe')
  })

  it('apple plans should have platformKey "apple"', () => {
    expect(appleMonthly.platformKey).toBe('apple')
    expect(appleYearly.platformKey).toBe('apple')
  })

  it('google plans should have platformKey "google"', () => {
    expect(googleMonthly.platformKey).toBe('google')
    expect(googleYearly.platformKey).toBe('google')
  })
})
