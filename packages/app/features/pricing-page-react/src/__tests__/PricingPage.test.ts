import { describe, expect, it } from 'vitest'

import * as PricingPageModule from '../index.js'
import type { PlanUpdatedPageProps, PricingPagePeriod, PricingPageProps } from '../index.js'

describe('@molecule/app-pricing-page-react module shape', () => {
  it('exports both page components', () => {
    expect(typeof PricingPageModule.PricingPage).toBe('function')
    expect(typeof PricingPageModule.PlanUpdatedPage).toBe('function')
  })

  it('PricingPage component has the expected display name', () => {
    // React function components expose their JS function name; this
    // catches accidental renames or default-export regressions.
    expect(PricingPageModule.PricingPage.name).toBe('PricingPage')
    expect(PricingPageModule.PlanUpdatedPage.name).toBe('PlanUpdatedPage')
  })
})

describe('PricingPageProps typing', () => {
  it('accepts a fully-specified props object', () => {
    interface BlogLimits {
      maxPosts: number
    }
    const props: PricingPageProps<BlogLimits> = {
      tiers: [
        {
          key: 'free',
          name: 'Free',
          prices: [{ period: 'month', price: '$0', stripePriceId: null }],
          limits: { maxPosts: 5 },
        },
        {
          key: 'pro',
          name: 'Pro',
          prices: [
            { period: 'month', price: '$8/mo', stripePriceId: 'price_m' },
            {
              period: 'year',
              price: '$80/yr',
              stripePriceId: 'price_y',
              savings: '2 months free',
            },
          ],
          limits: { maxPosts: 100 },
        },
      ],
      onCheckout: async (tier, price) => {
        expect(tier.key).toBeTypeOf('string')
        expect(price.period).toBeTypeOf('string')
      },
      showPeriodToggle: true,
      defaultPeriod: 'year',
      headingKey: 'pricingPage.heading',
      headingDefault: 'Pick a plan',
      renderLimits: (limits) => `${limits.maxPosts} posts`,
      className: 'pricing-page',
    }
    expect(props.tiers).toHaveLength(2)
    expect(props.defaultPeriod).toBe('year')
  })

  it('PricingPagePeriod accepts month and year only', () => {
    const monthly: PricingPagePeriod = 'month'
    const yearly: PricingPagePeriod = 'year'
    expect(monthly).toBe('month')
    expect(yearly).toBe('year')
  })

  it('all PricingPageProps fields are optional', () => {
    const props: PricingPageProps = {}
    expect(Object.keys(props)).toHaveLength(0)
  })
})

describe('PlanUpdatedPageProps typing', () => {
  it('accepts a fully-specified props object', () => {
    const props: PlanUpdatedPageProps = {
      planName: 'Pro',
      ctaLabel: 'Continue',
      onCta: () => {},
      className: 'plan-updated',
    }
    expect(props.planName).toBe('Pro')
  })

  it('accepts ctaHref instead of onCta', () => {
    const props: PlanUpdatedPageProps = {
      planName: 'Team',
      ctaLabel: 'Go to dashboard',
      ctaHref: '/dashboard',
    }
    expect(props.ctaHref).toBe('/dashboard')
  })

  it('all PlanUpdatedPageProps fields are optional', () => {
    const props: PlanUpdatedPageProps = {}
    expect(Object.keys(props)).toHaveLength(0)
  })
})
