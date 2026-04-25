/**
 * Full-flow integration test.
 *
 * Wires together:
 *   real Stripe-signed webhook payload
 *   → @molecule/api-payments-stripe bondAdapter.handleWebhookEvent (verifies signature)
 *   → simulated planKey update on a stateful in-memory user store
 *   → @molecule/api-entitlements getCachedPlanKey (sees the update)
 *   → @molecule/api-entitlements enforceLimit middleware (allows previously-blocked POST)
 *
 * Skipped when Stripe credentials are not in the environment.
 *
 * @module
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const skipIfNoCreds = !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET
const describeOrSkip = skipIfNoCreds ? describe.skip : describe

// In-memory user table — the bond's plan-cache reads this via findById.
type UserRow = {
  id: string
  email: string
  planKey?: string | null
  planExpiresAt?: string | null
  planAutoRenews?: boolean
  isAnonymous?: boolean
}

const userStore = new Map<string, UserRow>()

vi.mock('@molecule/api-database', () => {
  return {
    findById: vi.fn(async <T>(_table: string, id: string): Promise<T | null> => {
      const row = userStore.get(id)
      return (row ?? null) as T | null
    }),
  }
})

interface BlogLimits {
  maxPosts: number
  canExport: boolean
}

describeOrSkip('Full Stripe → entitlements flow', () => {
  let stripe: import('stripe').default
  let testProduct: import('stripe').default.Product
  let testPrice: import('stripe').default.Price
  let testCustomer: import('stripe').default.Customer

  let registryModule: typeof import('../../registry.js')
  let providerModule: typeof import('../../provider.js')
  let cacheModule: typeof import('../../cache.js')
  let middlewareModule: typeof import('../../middleware.js')

  beforeAll(async () => {
    if (skipIfNoCreds) return
    const StripeSdk = (await import('stripe')).default
    stripe = new StripeSdk(STRIPE_SECRET_KEY!)

    testProduct = await stripe.products.create({
      name: `entitlements-fullflow-${Date.now()}`,
    })
    testPrice = await stripe.prices.create({
      product: testProduct.id,
      unit_amount: 800,
      currency: 'usd',
      recurring: { interval: 'month' },
    })
    testCustomer = await stripe.customers.create({
      email: `fullflow-${Date.now()}@example.com`,
    })
  }, 60_000)

  beforeEach(async () => {
    vi.resetModules()
    userStore.clear()
    registryModule = await import('../../registry.js')
    providerModule = await import('../../provider.js')
    cacheModule = await import('../../cache.js')
    middlewareModule = await import('../../middleware.js')
    cacheModule.clearPlanCache()

    providerModule.setProvider(
      registryModule.defineTiers<BlogLimits>({
        tiers: {
          free: {
            planKey: 'free',
            category: 'free',
            name: 'Free',
            limits: { maxPosts: 5, canExport: false },
          },
          stripeMonthly: {
            planKey: 'stripeMonthly',
            category: 'pro',
            name: 'Pro',
            limits: { maxPosts: 100, canExport: true },
          },
        },
        defaultPlanKey: 'free',
        categoryOrder: ['free', 'pro'],
      }),
    )
  })

  afterEach(() => {
    cacheModule?.clearPlanCache()
  })

  it('a Stripe-signed event flips a free user to pro and unblocks enforceLimit', async () => {
    // 1. Set up a free user already at their post limit (5/5).
    const userId = 'user-fullflow-1'
    userStore.set(userId, {
      id: userId,
      email: 'fullflow@example.com',
      planKey: '',
      planAutoRenews: false,
    })

    // 2. enforceLimit on POST /posts with current count = 5: should be 403 on free tier.
    const handlerBefore = middlewareModule.enforceLimit<BlogLimits>({
      limitType: 'maxPosts',
      getLimit: (limits) => limits.maxPosts,
      getCurrent: async () => 5,
    })

    const status = vi.fn()
    const json = vi.fn()
    const res = {
      locals: { session: { userId } },
      status: ((code: number) => {
        status(code)
        return res
      }) as never,
      json: ((body: unknown) => {
        json(body)
        return res
      }) as never,
      set: vi.fn(),
    } as never

    await handlerBefore({}, res, vi.fn())
    expect(status).toHaveBeenCalledWith(403)
    const blockedBody = json.mock.calls[0]?.[0] as { upgradeTier?: string } | undefined
    expect(blockedBody?.upgradeTier).toBe('pro')

    // 3. Stripe sends a `customer.subscription.created` event for this user.
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400
    const eventBody = {
      id: `evt_full_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: `sub_full_${Date.now()}`,
          customer: testCustomer.id,
          status: 'active',
          items: {
            data: [
              {
                id: `si_full_${Date.now()}`,
                price: { product: testProduct.id, id: testPrice.id },
                current_period_end: periodEnd,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: null,
        },
      },
    }
    const payload = JSON.stringify(eventBody)
    const signedHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    })

    // 4. Run the production bondAdapter to verify + parse the event.
    const { paymentProvider } = await import('@molecule/api-payments-stripe')
    const event = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      rawBody: Buffer.from(payload),
      headers: { 'stripe-signature': signedHeader },
    })
    expect(event?.type).toBe('created')
    expect(event?.subscription?.customerId).toBe(testCustomer.id)

    // 5. Simulate the planKey update that handlePaymentNotification performs:
    //    given the parsed event, look up the user by customerId and update planKey.
    //    (We bypass the resource layer because this test focuses on the
    //    entitlements flow — handlePaymentNotification is independently tested
    //    in @molecule/api-resource-user/__tests__.)
    const expiresAt = event?.subscription?.expiresAt
    expect(expiresAt).toBeDefined()
    userStore.set(userId, {
      id: userId,
      email: 'fullflow@example.com',
      planKey: 'stripeMonthly',
      planExpiresAt: expiresAt!,
      planAutoRenews: true,
    })
    cacheModule.invalidateCachedPlanKey(userId)

    // 6. The same enforceLimit call should now permit the request — on the pro
    //    tier, maxPosts = 100, and the user only has 5 posts.
    const handlerAfter = middlewareModule.enforceLimit<BlogLimits>({
      limitType: 'maxPosts',
      getLimit: (limits) => limits.maxPosts,
      getCurrent: async () => 5,
    })
    const next = vi.fn()
    const statusAfter = vi.fn()
    const resAfter = {
      locals: { session: { userId } },
      status: ((code: number) => {
        statusAfter(code)
        return resAfter
      }) as never,
      json: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    } as never
    await handlerAfter({}, resAfter, next)
    expect(next).toHaveBeenCalled()
    expect(statusAfter).not.toHaveBeenCalled()

    // 7. Verify getCachedPlanKey now returns the new tier without re-querying
    //    (cache should have been populated on the previous call).
    const cached = await cacheModule.getCachedPlanKey(userId)
    expect(cached).toBe('stripeMonthly')
  }, 30_000)

  it('a canceled subscription event reverts the user to the default tier', async () => {
    const userId = 'user-fullflow-2'
    userStore.set(userId, {
      id: userId,
      email: 'cancel@example.com',
      planKey: 'stripeMonthly',
      planExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      planAutoRenews: true,
    })

    const tierBefore = await middlewareModule.getEffectiveTier<BlogLimits>({
      locals: { session: { userId } },
    } as never)
    expect(tierBefore.category).toBe('pro')
    expect(tierBefore.limits.canExport).toBe(true)

    // Stripe sends `customer.subscription.deleted`.
    const eventBody = {
      id: `evt_cancel_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: `sub_cancel_${Date.now()}`,
          customer: testCustomer.id,
          status: 'canceled',
          items: {
            data: [
              {
                id: `si_cancel_${Date.now()}`,
                price: { product: testProduct.id, id: testPrice.id },
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: Math.floor(Date.now() / 1000),
        },
      },
    }
    const payload = JSON.stringify(eventBody)
    const signedHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    })
    const { paymentProvider } = await import('@molecule/api-payments-stripe')
    const event = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      rawBody: Buffer.from(payload),
      headers: { 'stripe-signature': signedHeader },
    })
    expect(event?.type).toBe('canceled')

    // Simulate handlePaymentNotification's cancel path — clears planKey.
    userStore.set(userId, {
      id: userId,
      email: 'cancel@example.com',
      planKey: '',
      planAutoRenews: false,
    })
    cacheModule.invalidateCachedPlanKey(userId)

    const tierAfter = await middlewareModule.getEffectiveTier<BlogLimits>({
      locals: { session: { userId } },
    } as never)
    expect(tierAfter.category).toBe('free')
    expect(tierAfter.limits.canExport).toBe(false)
  }, 30_000)
})
