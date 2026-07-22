/**
 * Tests for the PayPal bond adapter.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CheckoutSessionResult,
  PayPalOrder,
  PayPalSubscription,
  WebhookEventResult,
} from '../types.js'

/**
 * Builds the same tagged shape `@molecule/api-secrets`'s `configNotConfiguredError()`
 * produces, without statically importing that package here — a top-level import
 * of `@molecule/api-secrets` would evaluate its module-load-time `getLogger()`
 * call BEFORE `mockLogger` below is initialized (ESM imports run before a
 * module's own top-level statements), throwing a TDZ ReferenceError.
 */
const configNotConfiguredError = (
  key: string,
  capability: string,
): Error & { statusCode: number; errorKey: string } =>
  Object.assign(new Error(`${key} is not set — ${capability} is disabled.`), {
    statusCode: 503,
    errorKey: 'config.notConfigured',
  })

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockSubscription: PayPalSubscription = {
  id: 'I-BW452GLLEP1G',
  status: 'ACTIVE',
  plan_id: 'P-5ML4271244454362WXNWU5NQ',
  custom_id: 'user_123',
  create_time: '2026-07-01T10:00:00Z',
  status_update_time: '2026-07-01T10:05:00Z',
  subscriber: { payer_id: 'PAYER123', email_address: 'buyer@example.com' },
  billing_info: { next_billing_time: '2099-08-01T10:00:00Z' },
}

const mockPlan = {
  id: 'P-5ML4271244454362WXNWU5NQ',
  product_id: 'PROD-6XF24676R0513620K',
  name: 'Pro Monthly',
  status: 'ACTIVE',
}

const mockCompletedOrder: PayPalOrder = {
  id: '5O190127TN364715T',
  status: 'COMPLETED',
  payer: { payer_id: 'PAYER123' },
  purchase_units: [
    {
      reference_id: 'pro-lifetime',
      payments: { captures: [{ id: '3C679366HH908993F', status: 'COMPLETED' }] },
    },
  ],
}

// ─── Provider mock functions ─────────────────────────────────────────────────

const mockGetSubscription = vi.fn<[], Promise<PayPalSubscription>>()
const mockGetPlan = vi.fn()
const mockGetOrder = vi.fn<[], Promise<PayPalOrder>>()
const mockCaptureOrder = vi.fn<[], Promise<PayPalOrder>>()
const mockCreateSubscription = vi.fn<[], Promise<CheckoutSessionResult>>()
const mockReviseSubscription = vi.fn()
const mockPaypalCancelSubscription = vi.fn<[], Promise<boolean>>()
const mockVerifyWebhookSignature = vi.fn<[], Promise<WebhookEventResult | null>>()

vi.mock('../provider.js', () => ({
  createSubscription: (...args: unknown[]) => mockCreateSubscription(...(args as [])),
  getSubscription: (...args: unknown[]) => mockGetSubscription(...(args as [])),
  getPlan: (...args: unknown[]) => mockGetPlan(...(args as [])),
  getOrder: (...args: unknown[]) => mockGetOrder(...(args as [])),
  captureOrder: (...args: unknown[]) => mockCaptureOrder(...(args as [])),
  reviseSubscription: (...args: unknown[]) => mockReviseSubscription(...(args as [])),
  cancelSubscription: (...args: unknown[]) => mockPaypalCancelSubscription(...(args as [])),
  verifyWebhookSignature: (...args: unknown[]) => mockVerifyWebhookSignature(...(args as [])),
  // The pure normalizers run for real inside the adapter tests — they carry the
  // status-gating semantics the adapter relies on.
  normalizeSubscriptionStatus: (rawStatus: string | undefined) => {
    const statusMap: Record<string, string> = {
      APPROVAL_PENDING: 'pending',
      APPROVED: 'pending',
      ACTIVE: 'active',
      SUSPENDED: 'past_due',
      CANCELLED: 'canceled',
      EXPIRED: 'expired',
    }
    return (rawStatus && statusMap[rawStatus]) || 'unknown'
  },
  normalizeSubscription: (subscription: PayPalSubscription, plan?: { product_id?: string }) => {
    const periodStart = subscription.status_update_time ?? subscription.create_time
    const periodEnd = subscription.billing_info?.next_billing_time
    return {
      provider: 'paypal',
      subscriptionId: subscription.id,
      productId: plan?.product_id ?? subscription.plan_id,
      status:
        (
          {
            APPROVAL_PENDING: 'pending',
            APPROVED: 'pending',
            ACTIVE: 'active',
            SUSPENDED: 'past_due',
            CANCELLED: 'canceled',
            EXPIRED: 'expired',
          } as Record<string, string>
        )[subscription.status] ?? 'unknown',
      isActive: subscription.status === 'ACTIVE',
      currentPeriodStart: periodStart ? Date.parse(periodStart) : undefined,
      currentPeriodEnd: periodEnd ? Date.parse(periodEnd) : undefined,
      willRenew: subscription.status === 'ACTIVE',
      canceledAt:
        subscription.status === 'CANCELLED' && subscription.status_update_time
          ? Date.parse(subscription.status_update_time)
          : undefined,
      rawData: subscription,
    }
  },
}))

// ─── Bond mock ───────────────────────────────────────────────────────────────

const mockFindByUserId = vi.fn()
const mockPaymentRecordService = {
  findByUserId: mockFindByUserId,
  store: vi.fn(),
  findByTransaction: vi.fn(),
  findByCustomerData: vi.fn(),
  deleteByUserId: vi.fn(),
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => mockLogger,
  get: vi.fn(() => mockPaymentRecordService),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PayPal Bond Adapter', () => {
  beforeEach(() => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'client_id_123')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'client_secret_123')
    vi.stubEnv('PAYPAL_WEBHOOK_ID', 'webhook_id_123')
    vi.stubEnv('API_ORIGIN', 'https://api.example.com')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')

    // Default mock implementations
    mockGetSubscription.mockResolvedValue(mockSubscription)
    mockGetPlan.mockResolvedValue(mockPlan)
    mockGetOrder.mockResolvedValue(mockCompletedOrder)
    mockCaptureOrder.mockResolvedValue(mockCompletedOrder)
    mockCreateSubscription.mockResolvedValue({
      id: 'I-NEW456',
      url: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123',
    })
    mockReviseSubscription.mockResolvedValue({
      subscription: mockSubscription,
      approveUrl:
        'https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-9',
    })
    mockPaypalCancelSubscription.mockResolvedValue(true)
    mockVerifyWebhookSignature.mockResolvedValue({
      id: 'WH-123',
      type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: mockSubscription as unknown as Record<string, unknown>,
    })
    mockFindByUserId.mockResolvedValue({
      userId: 'user_123',
      data: { subscriptionId: 'I-BW452GLLEP1G', customerId: 'PAYER123' },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  // ─── verifySubscription ──────────────────────────────────────────────────

  describe('verifySubscription', () => {
    it('verifies an active subscription (I- id) with plan + product ids', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('I-BW452GLLEP1G')

      expect(mockGetSubscription).toHaveBeenCalledWith('I-BW452GLLEP1G')
      expect(mockGetPlan).toHaveBeenCalledWith('P-5ML4271244454362WXNWU5NQ')
      expect(result).not.toBeNull()
      expect(result!.productId).toBe('PROD-6XF24676R0513620K')
      expect(result!.priceId).toBe('P-5ML4271244454362WXNWU5NQ')
      expect(result!.transactionId).toBe('I-BW452GLLEP1G')
      expect(result!.expiresAt).toBe(new Date('2099-08-01T10:00:00Z').toISOString())
      expect(result!.autoRenews).toBe(true)
      expect((result!.data as Record<string, unknown>).customerId).toBe('PAYER123')
      expect((result!.data as Record<string, unknown>).viaCheckoutSession).toBe(true)
    })

    it('rejects a non-active subscription (payment not confirmed / failed / canceled)', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      for (const status of ['APPROVAL_PENDING', 'APPROVED', 'SUSPENDED', 'CANCELLED', 'EXPIRED']) {
        mockGetSubscription.mockResolvedValue({ ...mockSubscription, status })
        const result = await paymentProvider.verifySubscription!('I-BW452GLLEP1G')
        expect(result, `status=${status}`).toBeNull()
      }
    })

    it('rejects an active subscription whose next billing time has already elapsed', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetSubscription.mockResolvedValue({
        ...mockSubscription,
        billing_info: { next_billing_time: '2020-01-01T00:00:00Z' },
      })

      const result = await paymentProvider.verifySubscription!('I-BW452GLLEP1G')
      expect(result).toBeNull()
    })

    it('still verifies when the plan lookup fails (priceId carries plan resolution)', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetPlan.mockRejectedValue(new Error('PayPal 500'))

      const result = await paymentProvider.verifySubscription!('I-BW452GLLEP1G')
      expect(result).not.toBeNull()
      expect(result!.priceId).toBe('P-5ML4271244454362WXNWU5NQ')
    })

    it('verifies a COMPLETED one-time order, mapping reference_id → productId', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('5O190127TN364715T')

      expect(mockGetOrder).toHaveBeenCalledWith('5O190127TN364715T')
      expect(mockCaptureOrder).not.toHaveBeenCalled()
      expect(result).not.toBeNull()
      expect(result!.productId).toBe('pro-lifetime')
      expect(result!.transactionId).toBe('3C679366HH908993F')
      expect(result!.autoRenews).toBe(false)
      expect((result!.data as Record<string, unknown>).customerId).toBe('PAYER123')
    })

    it('captures an APPROVED order on verify, then grants', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetOrder.mockResolvedValue({ ...mockCompletedOrder, status: 'APPROVED' })

      const result = await paymentProvider.verifySubscription!('5O190127TN364715T')

      expect(mockCaptureOrder).toHaveBeenCalledWith('5O190127TN364715T')
      expect(result).not.toBeNull()
      expect(result!.productId).toBe('pro-lifetime')
    })

    it('rejects a CREATED order (never buyer-approved)', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetOrder.mockResolvedValue({ ...mockCompletedOrder, status: 'CREATED' })

      const result = await paymentProvider.verifySubscription!('5O190127TN364715T')
      expect(result).toBeNull()
      expect(mockCaptureOrder).not.toHaveBeenCalled()
    })

    it('rethrows a config-not-configured error instead of returning null', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetSubscription.mockRejectedValue(
        configNotConfiguredError('PAYPAL_CLIENT_ID', 'payments'),
      )

      await expect(paymentProvider.verifySubscription!('I-BW452GLLEP1G')).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
    })

    it('returns null on a generic provider error', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockGetSubscription.mockRejectedValue(new Error('PayPal 404 RESOURCE_NOT_FOUND'))

      const result = await paymentProvider.verifySubscription!('I-DOESNOTEXIST')
      expect(result).toBeNull()
    })
  })

  // ─── handleWebhookEvent ──────────────────────────────────────────────────

  describe('handleWebhookEvent', () => {
    const makeReq = (body: unknown, headers: Record<string, string> = {}) => ({
      rawBody: typeof body === 'string' ? body : undefined,
      body,
      headers: {
        'paypal-transmission-id': 'transmission_123',
        'paypal-transmission-time': '2026-07-01T10:00:00Z',
        'paypal-transmission-sig': 'sig_123',
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123',
        'paypal-auth-algo': 'SHA256withRSA',
        ...headers,
      },
    })

    it('returns null when transmission headers are missing', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      const result = await paymentProvider.handleWebhookEvent!({ body: '{}', headers: {} })
      expect(result).toBeNull()
      expect(mockVerifyWebhookSignature).not.toHaveBeenCalled()
    })

    it('returns null when the body is not valid JSON', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      const result = await paymentProvider.handleWebhookEvent!(makeReq('not-json{'))
      expect(result).toBeNull()
      expect(mockVerifyWebhookSignature).not.toHaveBeenCalled()
    })

    it('returns null when PayPal reports signature FAILURE (forged body)', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue(null)

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-1',
            event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
            resource: {},
          }),
        ),
      )
      expect(result).toBeNull()
    })

    it('parses a BILLING.SUBSCRIPTION.ACTIVATED event into a created grant', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-123',
            event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
            resource: mockSubscription,
          }),
        ),
      )

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
        expect.objectContaining({
          transmissionId: 'transmission_123',
          transmissionSig: 'sig_123',
          certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123',
          authAlgo: 'SHA256withRSA',
        }),
      )
      expect(result).not.toBeNull()
      expect(result!.type).toBe('created')
      expect(result!.subscription).toMatchObject({
        customerId: 'PAYER123',
        productId: 'PROD-6XF24676R0513620K',
        priceId: 'P-5ML4271244454362WXNWU5NQ',
        autoRenews: true,
        status: 'active',
        isActive: true,
      })
      expect(result!.subscription!.expiresAt).toBe(new Date('2099-08-01T10:00:00Z').toISOString())
    })

    it('parses a BILLING.SUBSCRIPTION.CANCELLED event as non-active canceled', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue({
        id: 'WH-124',
        type: 'BILLING.SUBSCRIPTION.CANCELLED',
        resource: {
          ...mockSubscription,
          status: 'CANCELLED',
        } as unknown as Record<string, unknown>,
      })

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-124',
            event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
            resource: { ...mockSubscription, status: 'CANCELLED' },
          }),
        ),
      )

      expect(result!.type).toBe('canceled')
      expect(result!.subscription).toMatchObject({
        status: 'canceled',
        isActive: false,
        autoRenews: false,
      })
    })

    it('parses an already-parsed object body (middleware that consumed the stream)', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq({
          id: 'WH-123',
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: mockSubscription,
        }),
      )
      expect(result).not.toBeNull()
      expect(result!.type).toBe('created')
    })

    it('re-fetches the subscription for PAYMENT.SALE.COMPLETED (renewal) events', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue({
        id: 'WH-125',
        type: 'PAYMENT.SALE.COMPLETED',
        resource: { id: '3C679366HH908993F', billing_agreement_id: 'I-BW452GLLEP1G' },
      })

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-125',
            event_type: 'PAYMENT.SALE.COMPLETED',
            resource: { id: '3C679366HH908993F', billing_agreement_id: 'I-BW452GLLEP1G' },
          }),
        ),
      )

      expect(mockGetSubscription).toHaveBeenCalledWith('I-BW452GLLEP1G')
      expect(result!.type).toBe('renewed')
      expect(result!.subscription).toMatchObject({
        customerId: 'PAYER123',
        priceId: 'P-5ML4271244454362WXNWU5NQ',
        isActive: true,
      })
    })

    it('maps PAYMENT.SALE.REFUNDED to refund', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue({
        id: 'WH-126',
        type: 'PAYMENT.SALE.REFUNDED',
        resource: { id: '3C679366HH908993F', billing_agreement_id: 'I-BW452GLLEP1G' },
      })

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-126',
            event_type: 'PAYMENT.SALE.REFUNDED',
            resource: { id: '3C679366HH908993F', billing_agreement_id: 'I-BW452GLLEP1G' },
          }),
        ),
      )
      expect(result!.type).toBe('refund')
    })

    it('returns type-only for a sale event without billing_agreement_id', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue({
        id: 'WH-127',
        type: 'PAYMENT.SALE.COMPLETED',
        resource: { id: '3C679366HH908993F' },
      })

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({
            id: 'WH-127',
            event_type: 'PAYMENT.SALE.COMPLETED',
            resource: { id: '3C679366HH908993F' },
          }),
        ),
      )
      expect(result).toEqual({ type: 'renewed' })
    })

    it('passes through unrecognized event types with their raw type', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockVerifyWebhookSignature.mockResolvedValue({
        id: 'WH-128',
        type: 'VAULT.PAYMENT-TOKEN.CREATED',
        resource: {},
      })

      const result = await paymentProvider.handleWebhookEvent!(
        makeReq(
          JSON.stringify({ id: 'WH-128', event_type: 'VAULT.PAYMENT-TOKEN.CREATED', resource: {} }),
        ),
      )
      expect(result).toEqual({ type: 'VAULT.PAYMENT-TOKEN.CREATED' })
    })
  })

  // ─── updateSubscription ──────────────────────────────────────────────────

  describe('updateSubscription', () => {
    it('revises an existing subscription and returns the re-approval checkout URL', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'P-NEWPLAN123',
      })

      expect(mockReviseSubscription).toHaveBeenCalledWith('I-BW452GLLEP1G', 'P-NEWPLAN123')
      expect(result.updated).toBe(false)
      expect(result.checkoutUrl).toBe(
        'https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-9',
      )
    })

    it('reports updated:true when a revise applies without re-approval', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockReviseSubscription.mockResolvedValue({ subscription: mockSubscription, approveUrl: null })

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'P-NEWPLAN123',
      })

      expect(result.updated).toBe(true)
      expect(result.subscription).toEqual({
        expiresAt: new Date('2099-08-01T10:00:00Z').toISOString(),
        autoRenews: true,
      })
    })

    it('creates a new subscription + approval URL when the user has none', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockFindByUserId.mockResolvedValue(null)

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'P-5ML4271244454362WXNWU5NQ',
      })

      expect(mockCreateSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'P-5ML4271244454362WXNWU5NQ',
          returnUrl: 'https://api.example.com/api/users/user_123/verify-payment/paypal',
          cancelUrl: 'https://app.example.com',
          customId: 'user_123',
        }),
      )
      expect(result.updated).toBe(false)
      expect(result.checkoutUrl).toBe(
        'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123',
      )
    })

    it('returns { updated: false } when subscription creation yields no approval URL', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockFindByUserId.mockResolvedValue(null)
      mockCreateSubscription.mockResolvedValue({ id: 'I-NEW456', url: null })

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'P-5ML4271244454362WXNWU5NQ',
      })
      expect(result).toEqual({ updated: false })
    })

    it('rethrows a config-not-configured error instead of returning { updated: false }', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockFindByUserId.mockResolvedValue(null)
      mockCreateSubscription.mockRejectedValue(
        configNotConfiguredError('PAYPAL_CLIENT_SECRET', 'payments'),
      )

      await expect(
        paymentProvider.updateSubscription!({
          userId: 'user_123',
          newProductId: 'P-5ML4271244454362WXNWU5NQ',
        }),
      ).rejects.toMatchObject({ statusCode: 503, errorKey: 'config.notConfigured' })
    })

    it('returns { updated: false } on a generic provider error', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockReviseSubscription.mockRejectedValue(new Error('PayPal 422 UNPROCESSABLE_ENTITY'))

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'P-NEWPLAN123',
      })
      expect(result).toEqual({ updated: false })
    })
  })

  // ─── cancelSubscription ──────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('cancels the stored subscription', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_123' })

      expect(mockPaypalCancelSubscription).toHaveBeenCalledWith('I-BW452GLLEP1G')
      expect(result).toBe(true)
    })

    it('returns false when the user has no payment record', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockFindByUserId.mockResolvedValue(null)

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_123' })
      expect(result).toBe(false)
      expect(mockPaypalCancelSubscription).not.toHaveBeenCalled()
    })

    it('returns false when the record has no subscription id', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockFindByUserId.mockResolvedValue({ userId: 'user_123', data: {} })

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_123' })
      expect(result).toBe(false)
    })

    it('rethrows a config-not-configured error', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockPaypalCancelSubscription.mockRejectedValue(
        configNotConfiguredError('PAYPAL_CLIENT_ID', 'payments'),
      )

      await expect(
        paymentProvider.cancelSubscription!({ userId: 'user_123' }),
      ).rejects.toMatchObject({ statusCode: 503, errorKey: 'config.notConfigured' })
    })

    it('returns false on a generic provider error', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      mockPaypalCancelSubscription.mockRejectedValue(new Error('PayPal 404'))

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_123' })
      expect(result).toBe(false)
    })
  })
})
