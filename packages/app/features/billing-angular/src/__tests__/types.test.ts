import { describe, expect, it } from 'vitest'

import type {
  BillingStatus,
  CancelResponse,
  CheckoutResponse,
  PricingTierEntry,
  PricingTierPrice,
  PricingTiersResponse,
} from '../types.js'

interface BlogLimits {
  maxPosts: number
  canExport: boolean
}

describe('billing types', () => {
  it('PricingTierEntry accepts a typed limits payload', () => {
    const tier: PricingTierEntry<BlogLimits> = {
      key: 'pro',
      name: 'Pro',
      prices: [
        { period: 'month', price: '$8/mo', stripePriceId: 'price_123' },
        { period: 'year', price: '$80/yr', stripePriceId: 'price_456', savings: '2 months free' },
      ],
      limits: { maxPosts: 100, canExport: true },
    }
    expect(tier.limits.maxPosts).toBe(100)
    expect(tier.prices).toHaveLength(2)
  })

  it('PricingTiersResponse wraps an array of tiers', () => {
    const response: PricingTiersResponse<BlogLimits> = {
      data: [
        {
          key: 'free',
          name: 'Free',
          prices: [{ period: 'month', price: '$0', stripePriceId: null }],
          limits: { maxPosts: 5, canExport: false },
        },
      ],
    }
    expect(response.data[0]?.key).toBe('free')
  })

  it('BillingStatus mirrors the API status payload', () => {
    const status: BillingStatus<BlogLimits> = {
      planKey: 'stripeMonthly',
      category: 'pro',
      name: 'Pro',
      isFree: false,
      limits: { maxPosts: 100, canExport: true },
    }
    expect(status.isFree).toBe(false)
  })

  it('CheckoutResponse can carry checkoutUrl OR an updated subscription', () => {
    const newCustomer: CheckoutResponse = { checkoutUrl: 'https://checkout.stripe.com/c/test' }
    const existingCustomer: CheckoutResponse = {
      updated: true,
      subscription: { expiresAt: '2026-12-31T00:00:00Z', autoRenews: true },
    }
    expect(newCustomer.checkoutUrl).toContain('stripe')
    expect(existingCustomer.subscription?.autoRenews).toBe(true)
  })

  it('CancelResponse signals success or returns a localized error', () => {
    const ok: CancelResponse = { canceled: true }
    const fail: CancelResponse = { error: 'No active subscription to cancel.' }
    expect(ok.canceled).toBe(true)
    expect(fail.error).toMatch(/cancel/i)
  })

  it('PricingTierPrice accepts an optional savings tag', () => {
    const monthly: PricingTierPrice = { period: 'month', price: '$8/mo', stripePriceId: 'price_x' }
    const yearly: PricingTierPrice = {
      period: 'year',
      price: '$80/yr',
      stripePriceId: 'price_y',
      savings: '2 months free',
    }
    expect(monthly.savings).toBeUndefined()
    expect(yearly.savings).toBe('2 months free')
  })
})
