/**
 * Security tests for the generic payment verification handler.
 *
 * Covers the Stripe subscription-flow ownership binding (M3-2): a caller must
 * not be able to claim a subscription that belongs to another Stripe customer.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockGet,
  mockRequire,
  mockGetAnalytics,
  mockGetLogger,
  mockT,
  mockResourceUpdate,
  mockUpdateFn,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockRequire: vi.fn(),
  mockGetAnalytics: vi.fn(() => ({
    track: vi.fn(() => ({ catch: vi.fn() })),
    identify: vi.fn(() => ({ catch: vi.fn() })),
  })),
  mockGetLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
  mockT: vi.fn((key: string) => key),
  mockResourceUpdate: vi.fn(),
  mockUpdateFn: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  require: mockRequire,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-i18n', () => ({ t: mockT }))

vi.mock('@molecule/api-resource', () => ({
  update: vi.fn(() => mockUpdateFn),
}))

import type { MoleculeRequest } from '@molecule/api-resource'

import { verifyPayment } from '../handlers/payments/verifyPayment.js'
import { propsSchema } from '../schema.js'

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }
const handler = verifyPayment(testResource)

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest =>
  ({
    body: {},
    params: {} as Record<string, string>,
    query: {},
    headers: {},
    cookies: {} as Record<string, string>,
    ...overrides,
  }) as unknown as MoleculeRequest

/** Wire the Stripe subscription provider + plan service + records bond. */
const wire = (opts: {
  verifiedCustomerId?: string
  viaCheckoutSession?: boolean
  storedCustomerId?: string | null
}) => {
  const provider = {
    providerName: 'stripe',
    verifyFlow: 'subscription' as const,
    verifySubscription: vi.fn().mockResolvedValue({
      productId: 'prod_premium',
      transactionId: 'sub_abc',
      expiresAt: new Date(4070908800000).toISOString(),
      autoRenews: true,
      data: { customerId: opts.verifiedCustomerId, viaCheckoutSession: !!opts.viaCheckoutSession },
    }),
  }
  const plans = {
    findPlan: vi.fn(),
    findPlanByProductId: vi.fn(() => ({ planKey: 'premium', platformKey: 'stripe' })),
    getDefaultPlan: vi.fn(),
    getAllPlans: vi.fn(),
  }
  const records = {
    findByUserId: vi
      .fn()
      .mockResolvedValue(
        opts.storedCustomerId === undefined
          ? null
          : opts.storedCustomerId === null
            ? null
            : { data: { customerId: opts.storedCustomerId } },
      ),
    store: vi.fn().mockResolvedValue(undefined),
    findByTransaction: vi.fn(),
    findByCustomerData: vi.fn(),
    deleteByUserId: vi.fn(),
  }
  mockRequire.mockImplementation((category: string) => {
    if (category === 'payments') return provider
    if (category === 'plans') return plans
    return undefined
  })
  mockGet.mockImplementation((category: string) =>
    category === 'paymentRecords' ? records : undefined,
  )
  return { provider, plans, records }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateFn.mockResolvedValue({ statusCode: 200, body: { props: { planKey: 'premium' } } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('verifyPayment — Stripe subscription ownership binding (M3-2)', () => {
  it('REGRESSION: rejects a free user claiming a foreign subscription id (no record, bare sub_)', async () => {
    wire({ verifiedCustomerId: 'cus_victim', viaCheckoutSession: false, storedCustomerId: null })

    const req = makeReq({
      params: { id: 'attacker', provider: 'stripe' },
      body: { subscriptionId: 'sub_victim' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.subscriptionOwnershipMismatch',
    )
    // Plan must NOT be granted.
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('REGRESSION: rejects when the verified customer differs from the stored customer', async () => {
    wire({
      verifiedCustomerId: 'cus_victim',
      viaCheckoutSession: false,
      storedCustomerId: 'cus_attacker',
    })

    const req = makeReq({
      params: { id: 'attacker', provider: 'stripe' },
      body: { subscriptionId: 'sub_victim' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('allows a first-time grant through the per-user checkout-session redirect', async () => {
    wire({ verifiedCustomerId: 'cus_me', viaCheckoutSession: true, storedCustomerId: null })

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      query: { subscriptionId: 'cs_my_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'me', props: expect.objectContaining({ planKey: 'premium' }) }),
    )
  })

  it('allows a returning user whose stored customer matches the verified subscription', async () => {
    wire({ verifiedCustomerId: 'cus_me', viaCheckoutSession: false, storedCustomerId: 'cus_me' })

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      body: { subscriptionId: 'sub_me' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalled()
  })
})
