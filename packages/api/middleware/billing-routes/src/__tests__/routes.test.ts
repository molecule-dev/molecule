/**
 * Tests for `createBillingRoutes()` — exercises each route end-to-end with an
 * in-process Express app + injected mock provider.
 *
 * @module
 */

import type { AddressInfo } from 'node:net'

import express, { type Express } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBillingRoutes } from '../routes.js'
import { defineTiers } from '../tiers.js'
import type { BillingProvider } from '../types.js'

interface ResponseShape<T = unknown> {
  status: number
  body: T
}

const buildApp = (
  router: ReturnType<typeof createBillingRoutes>,
  userId: string | null = 'user_42',
): Express => {
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    if (userId) {
      ;(res.locals as { session?: { userId: string } }).session = { userId }
    }
    next()
  })
  app.use('/billing', router)
  return app
}

const request = async <T = unknown>(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<ResponseShape<T>> => {
  return await new Promise<ResponseShape<T>>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      const payload = body == null ? undefined : JSON.stringify(body)
      const req = {
        method,
        host: '127.0.0.1',
        port,
        path,
        headers: payload
          ? {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(payload).toString(),
            }
          : undefined,
      } as const

      void import('node:http').then(({ request: httpRequest }) => {
        const r = httpRequest(req, (res) => {
          let raw = ''
          res.setEncoding('utf-8')
          res.on('data', (chunk: string) => {
            raw += chunk
          })
          res.on('end', () => {
            server.close(() => {
              try {
                resolve({
                  status: res.statusCode ?? 0,
                  body: raw ? (JSON.parse(raw) as T) : (undefined as unknown as T),
                })
              } catch (err) {
                reject(err as Error)
              }
            })
          })
        })
        r.on('error', (err) => {
          server.close()
          reject(err)
        })
        if (payload) r.write(payload)
        r.end()
      })
    })
  })
}

const tiers = defineTiers([
  { id: 'free', name: 'Free', features: [], priceMonthly: 0 },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    features: [],
    priceMonthly: 1200,
    stripePriceId: 'price_pro_monthly',
  },
  {
    id: 'pro_yearly',
    name: 'Pro Yearly',
    features: [],
    priceYearly: 12000,
    stripePriceId: 'price_pro_yearly',
  },
])

const buildProvider = (overrides: Partial<BillingProvider> = {}): BillingProvider => ({
  providerName: 'stripe',
  verifyFlow: 'subscription',
  notificationFlow: 'webhook',
  ...overrides,
})

describe('createBillingRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /billing/checkout', () => {
    it('returns 401 when no session is present', async () => {
      const provider = buildProvider({
        updateSubscription: vi.fn(),
      })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router, null)

      const res = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(401)
      expect(res.body.code).toBe('auth.unauthorized')
      expect(provider.updateSubscription).not.toHaveBeenCalled()
    })

    it('returns 400 when priceId is missing or non-string', async () => {
      const provider = buildProvider({ updateSubscription: vi.fn() })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const empty = await request<{ code: string }>(app, 'POST', '/billing/checkout', {})
      expect(empty.status).toBe(400)
      expect(empty.body.code).toBe('billing.invalidPriceId')

      const wrongType = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 123,
      })
      expect(wrongType.status).toBe(400)
      expect(wrongType.body.code).toBe('billing.invalidPriceId')
    })

    it('returns 400 for a priceId that is not in the configured tiers', async () => {
      const provider = buildProvider({ updateSubscription: vi.fn() })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_unknown',
      })

      expect(res.status).toBe(400)
      expect(res.body.code).toBe('billing.unknownPriceId')
      expect(provider.updateSubscription).not.toHaveBeenCalled()
    })

    it('returns 503 when the provider does not implement updateSubscription', async () => {
      const provider = buildProvider({})
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(503)
      expect(res.body.code).toBe('billing.providerUnavailable')
    })

    it('returns checkoutUrl from the provider for new subscriptions', async () => {
      const updateSubscription = vi.fn().mockResolvedValue({
        updated: false,
        checkoutUrl: 'https://checkout.stripe.com/sess_abc',
      })
      const provider = buildProvider({ updateSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ checkoutUrl: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(200)
      expect(res.body.checkoutUrl).toBe('https://checkout.stripe.com/sess_abc')
      expect(updateSubscription).toHaveBeenCalledWith({
        userId: 'user_42',
        newProductId: 'price_pro_monthly',
      })
    })

    it('returns updated:true and the subscription for in-place plan changes', async () => {
      const updateSubscription = vi.fn().mockResolvedValue({
        updated: true,
        subscription: { expiresAt: '2026-12-31T00:00:00.000Z', autoRenews: true },
      })
      const provider = buildProvider({ updateSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{
        updated: boolean
        subscription: { expiresAt: string; autoRenews: boolean }
      }>(app, 'POST', '/billing/checkout', { priceId: 'price_pro_yearly' })

      expect(res.status).toBe(200)
      expect(res.body.updated).toBe(true)
      expect(res.body.subscription.autoRenews).toBe(true)
    })

    it('returns 502 when the provider returns neither checkoutUrl nor updated', async () => {
      const updateSubscription = vi.fn().mockResolvedValue({ updated: false })
      const provider = buildProvider({ updateSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.checkoutFailed')
    })

    it('returns 502 when the provider throws', async () => {
      const updateSubscription = vi.fn().mockRejectedValue(new Error('boom'))
      const provider = buildProvider({ updateSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.checkoutFailed')
    })
  })

  describe('POST /billing/cancel', () => {
    it('returns 401 when no session is present', async () => {
      const provider = buildProvider({ cancelSubscription: vi.fn() })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router, null)

      const res = await request<{ code: string }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('auth.unauthorized')
    })

    it('returns 503 when the provider does not implement cancelSubscription', async () => {
      const router = createBillingRoutes({ tiers, provider: buildProvider({}) })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(503)
      expect(res.body.code).toBe('billing.providerUnavailable')
    })

    it('returns canceled:true on success', async () => {
      const cancelSubscription = vi.fn().mockResolvedValue(true)
      const provider = buildProvider({ cancelSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ canceled: boolean }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(200)
      expect(res.body.canceled).toBe(true)
      expect(cancelSubscription).toHaveBeenCalledWith({ userId: 'user_42' })
    })

    it('returns 400 when the provider reports no active subscription', async () => {
      const cancelSubscription = vi.fn().mockResolvedValue(false)
      const provider = buildProvider({ cancelSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(400)
      expect(res.body.code).toBe('billing.cancelFailed')
    })

    it('returns 502 when the provider throws', async () => {
      const cancelSubscription = vi.fn().mockRejectedValue(new Error('boom'))
      const provider = buildProvider({ cancelSubscription })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.cancelFailed')
    })
  })

  describe('POST /billing/portal', () => {
    it('returns 401 when no session is present', async () => {
      const provider = buildProvider({ createPortalSession: vi.fn() })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router, null)

      const res = await request<{ code: string }>(app, 'POST', '/billing/portal')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('auth.unauthorized')
    })

    it('returns 501 when the provider does not implement createPortalSession', async () => {
      const provider = buildProvider({})
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/portal')
      expect(res.status).toBe(501)
      expect(res.body.code).toBe('billing.portalNotSupported')
    })

    it('returns the portal url on success', async () => {
      const createPortalSession = vi.fn().mockResolvedValue({
        id: 'bps_abc',
        url: 'https://billing.stripe.com/p/abc',
      })
      const provider = buildProvider({ createPortalSession })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ url: string }>(app, 'POST', '/billing/portal', {
        returnUrl: 'https://example.com/account',
      })

      expect(res.status).toBe(200)
      expect(res.body.url).toBe('https://billing.stripe.com/p/abc')
      expect(createPortalSession).toHaveBeenCalledWith({
        userId: 'user_42',
        returnUrl: 'https://example.com/account',
      })
    })

    it('returns 502 when the provider returns no url', async () => {
      const createPortalSession = vi.fn().mockResolvedValue(null)
      const provider = buildProvider({ createPortalSession })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/portal')
      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.portalFailed')
    })

    it('returns 502 when the provider throws', async () => {
      const createPortalSession = vi.fn().mockRejectedValue(new Error('boom'))
      const provider = buildProvider({ createPortalSession })
      const router = createBillingRoutes({ tiers, provider })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/portal')
      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.portalFailed')
    })
  })

  describe('GET /billing/tiers', () => {
    it('is public (no auth) and returns one derived entry per TierDef', async () => {
      const router = createBillingRoutes({ tiers, provider: buildProvider() })
      const app = buildApp(router, null)

      const res = await request<{
        data: Array<{
          key: string
          name: string
          prices: Array<{ period: string; price: string; stripePriceId: string | null }>
          limits: Record<string, unknown>
        }>
      }>(app, 'GET', '/billing/tiers')

      expect(res.status).toBe(200)
      expect(res.body.data.map((tier) => tier.key)).toEqual(['free', 'pro_monthly', 'pro_yearly'])
      // Every entry carries the frontend-required fields.
      for (const entry of res.body.data) {
        expect(typeof entry.name).toBe('string')
        expect(Array.isArray(entry.prices)).toBe(true)
        expect(entry.limits).toBeDefined()
      }
    })

    it('derives period, display price, and stripePriceId from each TierDef', async () => {
      const router = createBillingRoutes({ tiers, provider: buildProvider() })
      const app = buildApp(router)

      const res = await request<{
        data: Array<{
          key: string
          prices: Array<{ period: string; price: string; stripePriceId: string | null }>
        }>
      }>(app, 'GET', '/billing/tiers')

      const byKey = Object.fromEntries(res.body.data.map((tier) => [tier.key, tier]))
      expect(byKey.free.prices).toEqual([{ period: 'month', price: '$0', stripePriceId: null }])
      expect(byKey.pro_monthly.prices).toEqual([
        { period: 'month', price: '$12/mo', stripePriceId: 'price_pro_monthly' },
      ])
      expect(byKey.pro_yearly.prices).toEqual([
        { period: 'year', price: '$120/yr', stripePriceId: 'price_pro_yearly' },
      ])
    })

    it('honors a custom formatPrice on the derive path', async () => {
      const formatPrice = vi.fn(
        (amountMinor: number, period: 'month' | 'year') => `${amountMinor}${period[0]}`,
      )
      const router = createBillingRoutes({ tiers, provider: buildProvider(), formatPrice })
      const app = buildApp(router)

      const res = await request<{ data: Array<{ key: string; prices: Array<{ price: string }> }> }>(
        app,
        'GET',
        '/billing/tiers',
      )

      const proMonthly = res.body.data.find((tier) => tier.key === 'pro_monthly')
      expect(proMonthly?.prices[0].price).toBe('1200m')
      expect(formatPrice).toHaveBeenCalled()
    })

    it('serves options.getPricingTiers() verbatim when supplied', async () => {
      const rich = [
        {
          key: 'free',
          name: 'Free',
          prices: [{ period: 'month' as const, price: '$0', stripePriceId: null }],
          limits: { maxProjects: 1 },
        },
        {
          key: 'pro',
          name: 'Pro',
          perSeat: true,
          prices: [
            { period: 'month' as const, price: '$19/mo', stripePriceId: 'price_month' },
            {
              period: 'year' as const,
              price: '$190/yr',
              stripePriceId: 'price_year',
              savings: '2 months free',
            },
          ],
          limits: { maxProjects: 999 },
        },
      ]
      const router = createBillingRoutes<{ maxProjects: number }>({
        tiers: defineTiers([{ id: 'free', name: 'Free', features: [] }]),
        provider: buildProvider(),
        getPricingTiers: () => rich,
      })
      const app = buildApp(router)

      const res = await request<{ data: typeof rich }>(app, 'GET', '/billing/tiers')
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual(rich)
    })
  })

  describe('GET /billing/status', () => {
    it('returns 401 when no session is present', async () => {
      const router = createBillingRoutes({ tiers, provider: buildProvider() })
      const app = buildApp(router, null)

      const res = await request<{ code: string }>(app, 'GET', '/billing/status')
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('auth.unauthorized')
    })

    it('returns the default (first/free) tier snapshot when no resolveStatus is configured', async () => {
      const router = createBillingRoutes({ tiers, provider: buildProvider() })
      const app = buildApp(router)

      const res = await request<{
        planKey: string
        category: string
        name: string
        limits: Record<string, unknown>
        isFree: boolean
      }>(app, 'GET', '/billing/status')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        planKey: 'free',
        category: 'free',
        name: 'Free',
        limits: {},
        isFree: true,
      })
    })

    it('uses resolveStatus for the authenticated user when supplied', async () => {
      const resolveStatus = vi.fn().mockResolvedValue({
        planKey: 'pro_monthly',
        category: 'pro',
        name: 'Pro Monthly',
        limits: { maxProjects: 999 },
        isFree: false,
      })
      const router = createBillingRoutes({ tiers, provider: buildProvider(), resolveStatus })
      const app = buildApp(router)

      const res = await request<{ planKey: string; category: string; isFree: boolean }>(
        app,
        'GET',
        '/billing/status',
      )

      expect(res.status).toBe(200)
      expect(res.body.planKey).toBe('pro_monthly')
      expect(res.body.category).toBe('pro')
      expect(res.body.isFree).toBe(false)
      expect(resolveStatus).toHaveBeenCalledWith('user_42', expect.anything(), expect.anything())
    })

    it('falls back to the default snapshot when resolveStatus returns null', async () => {
      const resolveStatus = vi.fn().mockResolvedValue(null)
      const router = createBillingRoutes({ tiers, provider: buildProvider(), resolveStatus })
      const app = buildApp(router)

      const res = await request<{ planKey: string; isFree: boolean }>(app, 'GET', '/billing/status')
      expect(res.status).toBe(200)
      expect(res.body.planKey).toBe('free')
      expect(res.body.isFree).toBe(true)
    })

    it('returns 502 when resolveStatus throws', async () => {
      const resolveStatus = vi.fn().mockRejectedValue(new Error('boom'))
      const router = createBillingRoutes({ tiers, provider: buildProvider(), resolveStatus })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'GET', '/billing/status')
      expect(res.status).toBe(502)
      expect(res.body.code).toBe('billing.statusFailed')
    })
  })

  describe('provider resolution', () => {
    it('uses the bonded payments provider when none is injected', async () => {
      const cancelSubscription = vi.fn().mockResolvedValue(true)
      const bondModule = await import('@molecule/api-bond')
      bondModule.bond('payments', 'stripe', {
        providerName: 'stripe',
        cancelSubscription,
      } as BillingProvider)

      const router = createBillingRoutes({ tiers })
      const app = buildApp(router)

      const res = await request<{ canceled: boolean }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(200)
      expect(res.body.canceled).toBe(true)
      expect(cancelSubscription).toHaveBeenCalledWith({ userId: 'user_42' })

      bondModule.unbond('payments', 'stripe')
    })

    it('uses a custom providerName when supplied', async () => {
      const cancelSubscription = vi.fn().mockResolvedValue(true)
      const bondModule = await import('@molecule/api-bond')
      bondModule.bond('payments', 'mock', {
        providerName: 'mock',
        cancelSubscription,
      } as BillingProvider)

      const router = createBillingRoutes({ tiers, providerName: 'mock' })
      const app = buildApp(router)

      const res = await request<{ canceled: boolean }>(app, 'POST', '/billing/cancel')
      expect(res.status).toBe(200)
      expect(cancelSubscription).toHaveBeenCalled()

      bondModule.unbond('payments', 'mock')
    })

    it('returns 503 when no provider is bonded and none is injected', async () => {
      const router = createBillingRoutes({ tiers })
      const app = buildApp(router)

      const res = await request<{ code: string }>(app, 'POST', '/billing/portal')
      expect(res.status).toBe(503)
      expect(res.body.code).toBe('billing.providerUnavailable')
    })

    it('honors a custom resolveUserId implementation', async () => {
      const updateSubscription = vi.fn().mockResolvedValue({
        updated: false,
        checkoutUrl: 'https://checkout.example.com/sess',
      })
      const provider = buildProvider({ updateSubscription })
      const router = createBillingRoutes({
        tiers,
        provider,
        resolveUserId: () => 'custom_user',
      })
      const app = buildApp(router, null)

      const res = await request<{ checkoutUrl: string }>(app, 'POST', '/billing/checkout', {
        priceId: 'price_pro_monthly',
      })

      expect(res.status).toBe(200)
      expect(updateSubscription).toHaveBeenCalledWith({
        userId: 'custom_user',
        newProductId: 'price_pro_monthly',
      })
    })
  })
})

describe('secret registration', () => {
  it('registers STRIPE_SECRET_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('STRIPE_SECRET_KEY')).toBeDefined()
  })
})
