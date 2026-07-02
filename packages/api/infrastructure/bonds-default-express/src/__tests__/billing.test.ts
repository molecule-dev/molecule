/**
 * createBillingRouter — plan-catalogue registration.
 *
 * The router must derive the app's Stripe plan catalogue from its pricing
 * tiers and register it with @molecule/api-resource-payment, so payment
 * verification / webhooks can resolve grants. Without this every successful
 * payment fails plan resolution ("unknown plan"): charged, never upgraded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { registerPlansMock, warnMock } = vi.hoisted(() => ({
  registerPlansMock: vi.fn(),
  warnMock: vi.fn(),
}))

vi.mock(import('@molecule/api-bond'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    get: vi.fn(() => null),
    getLogger: () => ({ info: vi.fn(), warn: warnMock, error: vi.fn(), debug: vi.fn() }),
  }
})

vi.mock('@molecule/api-entitlements', () => ({
  getEffectiveTier: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-resource-payment', () => ({
  registerPlans: registerPlansMock,
}))

import { createBillingRouter } from '../billing.js'

/** Online-store-shaped fixture: free + two paid tiers, monthly/yearly each. */
const getPricingTiers = () => [
  { key: 'free', name: 'Free', prices: [{ period: 'month', price: '$0', stripePriceId: null }] },
  {
    key: 'pro',
    name: 'Pro',
    prices: [
      { period: 'month', price: '$12', stripePriceId: 'price_pro_m' },
      { period: 'year', price: '$120', stripePriceId: 'price_pro_y' },
    ],
  },
  {
    key: 'team',
    name: 'Team',
    prices: [
      { period: 'month', price: '$49', stripePriceId: 'price_team_m' },
      { period: 'year', price: '$490', stripePriceId: 'price_team_y' },
    ],
  },
]

const planKeys = {
  free: 'free',
  proMonthly: 'stripeMonthly',
  proYearly: 'stripeYearly',
  teamMonthly: 'teamMonthly',
  teamYearly: 'teamYearly',
}

beforeEach(() => {
  registerPlansMock.mockClear()
  warnMock.mockClear()
})

describe('createBillingRouter plan registration', () => {
  it('registers the full Stripe catalogue derived from pricing tiers at construction', () => {
    createBillingRouter({ getPricingTiers, planKeys })

    expect(registerPlansMock).toHaveBeenCalledTimes(1)
    const registered = registerPlansMock.mock.calls[0]![0] as Record<
      string,
      { platformKey: string; platformPriceIds?: string[]; period: string; planKey: string }
    >

    // Four paid plans, keyed by the app's entitlement planKeys.
    expect(Object.keys(registered).sort()).toEqual([
      'stripeMonthly',
      'stripeYearly',
      'teamMonthly',
      'teamYearly',
    ])
    expect(registered.stripeMonthly).toMatchObject({
      planKey: 'stripeMonthly',
      platformKey: 'stripe',
      platformPriceIds: ['price_pro_m'],
      period: 'month',
      alias: 'monthly',
    })
    expect(registered.teamYearly).toMatchObject({
      planKey: 'teamYearly',
      platformPriceIds: ['price_team_y'],
      period: 'year',
      alias: 'yearly',
    })
    // The free tier (no stripePriceId) is never registered as a paid plan.
    expect(Object.values(registered).some((p) => p.planKey === 'free')).toBe(false)
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('skips (with a warning) a paid price whose planKeys entry is missing', () => {
    createBillingRouter({
      getPricingTiers: () => [
        {
          key: 'plus',
          name: 'Plus',
          prices: [{ period: 'month', price: '$5', stripePriceId: 'price_plus_m' }],
        },
      ],
      planKeys: { free: 'free' },
    })

    expect(registerPlansMock).not.toHaveBeenCalled()
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(String(warnMock.mock.calls[0]![0])).toContain('plusMonthly')
  })

  it('does not register anything when no tier has a Stripe price id (env unset)', () => {
    createBillingRouter({
      getPricingTiers: () => [
        { key: 'free', name: 'Free', prices: [{ period: 'month', stripePriceId: null }] },
        { key: 'pro', name: 'Pro', prices: [{ period: 'month', stripePriceId: null }] },
      ],
      planKeys,
    })
    expect(registerPlansMock).not.toHaveBeenCalled()
  })
})
