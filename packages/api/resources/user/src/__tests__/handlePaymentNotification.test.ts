/**
 * Security tests for the generic payment notification (webhook) handler.
 *
 * Covers the Stripe webhook entitlement status gate (M3-1): a signed
 * `customer.subscription.updated` for a subscription that is NOT active/trialing
 * (e.g. past_due after a renewal-payment failure, or incomplete) must NOT
 * grant/extend the plan — mirroring the verify path's `isActive` gate. The
 * cancellation branch and legitimate active renewals must keep working.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockGetAnalytics, mockGetLogger, mockUpdateFn } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetAnalytics: vi.fn(() => ({
    track: vi.fn(() => ({ catch: vi.fn() })),
    identify: vi.fn(() => ({ catch: vi.fn() })),
  })),
  mockGetLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
  mockUpdateFn: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-resource', () => ({
  update: vi.fn(() => mockUpdateFn),
}))

import type { WebhookEvent } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'

import { handlePaymentNotification } from '../handlers/payments/handlePaymentNotification.js'
import { propsSchema } from '../schema.js'

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }
const handler = handlePaymentNotification(testResource)

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest =>
  ({
    body: {},
    params: { provider: 'stripe' } as Record<string, string>,
    query: {},
    headers: {},
    cookies: {} as Record<string, string>,
    ...overrides,
  }) as unknown as MoleculeRequest

/** Wire a Stripe webhook provider + plan service + records bond. */
const wire = (event: WebhookEvent) => {
  const provider = {
    providerName: 'stripe',
    notificationFlow: 'webhook' as const,
    handleWebhookEvent: vi.fn().mockResolvedValue(event),
  }
  const plans = {
    findPlan: vi.fn(),
    findPlanByProductId: vi.fn(() => ({ planKey: 'premium', platformKey: 'stripe' })),
    getDefaultPlan: vi.fn(),
    getAllPlans: vi.fn(),
  }
  const records = {
    findByUserId: vi.fn(),
    store: vi.fn(),
    findByTransaction: vi.fn(),
    findByCustomerData: vi.fn().mockResolvedValue({ userId: 'user1' }),
    deleteByUserId: vi.fn(),
  }
  mockGet.mockImplementation((category: string) => {
    if (category === 'payments') return provider
    if (category === 'plans') return plans
    if (category === 'paymentRecords') return records
    return undefined
  })
  return { provider, plans, records }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateFn.mockResolvedValue({ statusCode: 200, body: 'OK' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handlePaymentNotification — Stripe webhook status gate (M3-1)', () => {
  it('REGRESSION: a past_due renewal-failure webhook does NOT extend entitlement', async () => {
    // Renewal payment failed: Stripe fires a signed customer.subscription.updated
    // (mapped to "renewed") with status=past_due and an ADVANCED expiresAt. The
    // handler must not grant/extend the plan for the unpaid cycle.
    wire({
      type: 'renewed',
      subscription: {
        customerId: 'cus_pastdue',
        productId: 'prod_premium',
        expiresAt: new Date(4070908800000).toISOString(),
        autoRenews: true,
        status: 'past_due',
        isActive: false,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    // No plan grant / extension occurred.
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('REGRESSION: an incomplete (unsettled) created webhook does NOT grant the plan', async () => {
    wire({
      type: 'created',
      subscription: {
        customerId: 'cus_incomplete',
        productId: 'prod_premium',
        expiresAt: new Date(4070908800000).toISOString(),
        autoRenews: true,
        status: 'pending',
        isActive: false,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('grants/extends the plan for a legitimate active renewal', async () => {
    const expiresAt = new Date(4070908800000).toISOString()
    wire({
      type: 'renewed',
      subscription: {
        customerId: 'cus_active',
        productId: 'prod_premium',
        expiresAt,
        autoRenews: true,
        status: 'active',
        isActive: true,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user1',
        props: expect.objectContaining({
          planKey: 'premium',
          planExpiresAt: expiresAt,
          planAutoRenews: true,
        }),
      }),
    )
  })

  it('grants the plan for a trialing subscription', async () => {
    wire({
      type: 'created',
      subscription: {
        customerId: 'cus_trial',
        productId: 'prod_premium',
        expiresAt: new Date(4070908800000).toISOString(),
        autoRenews: true,
        status: 'trialing',
        isActive: true,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user1',
        props: expect.objectContaining({ planKey: 'premium' }),
      }),
    )
  })

  it('still clears the plan on a cancellation event regardless of status', async () => {
    wire({
      type: 'canceled',
      subscription: {
        customerId: 'cus_cancel',
        productId: 'prod_premium',
        expiresAt: undefined,
        autoRenews: false,
        status: 'canceled',
        isActive: false,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user1',
        props: expect.objectContaining({ planKey: '', planAutoRenews: false }),
      }),
    )
  })

  it('preserves prior grant behavior when a provider surfaces no status', async () => {
    // A non-Stripe webhook provider that does not surface status/isActive must
    // keep working (status-unknown → grant).
    wire({
      type: 'renewed',
      subscription: {
        customerId: 'cus_nostatus',
        productId: 'prod_premium',
        expiresAt: new Date(4070908800000).toISOString(),
        autoRenews: true,
      },
    })

    const result = await handler(makeReq())

    expect(result.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user1',
        props: expect.objectContaining({ planKey: 'premium' }),
      }),
    )
  })
})
