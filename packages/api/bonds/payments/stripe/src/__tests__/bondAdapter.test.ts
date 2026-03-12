/**
 * Tests for the Stripe bond adapter.
 *
 * @module
 */

import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckoutSessionResult, SubscriptionResult, WebhookEventResult } from '../types.js'

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockSubscriptionResult: SubscriptionResult = {
  id: 'sub_abc123',
  status: 'active',
  items: {
    data: [{ id: 'si_item1', price: { product: 'prod_premium' } }],
  },
  current_period_start: 1700000000,
  current_period_end: 1702592000,
  cancel_at_period_end: false,
  canceled_at: null,
}

const mockCheckoutSessionResult: CheckoutSessionResult = {
  id: 'cs_test_session',
  url: 'https://checkout.stripe.com/pay/cs_test_session',
  subscription: 'sub_abc123',
}

// ─── Provider mock functions ─────────────────────────────────────────────────

const mockCreateCheckoutSession = vi.fn<[], Promise<CheckoutSessionResult>>()
const mockGetCheckoutSession = vi.fn<[], Promise<CheckoutSessionResult>>()
const mockGetSubscription = vi.fn<[], Promise<SubscriptionResult>>()
const mockNormalizeSubscription = vi.fn()
const mockStripeUpdateSubscription = vi.fn<[], Promise<SubscriptionResult>>()
const mockVerifyWebhookSignature = vi.fn<[], WebhookEventResult>()

vi.mock('../provider.js', () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...(args as [])),
  getCheckoutSession: (...args: unknown[]) => mockGetCheckoutSession(...(args as [])),
  getSubscription: (...args: unknown[]) => mockGetSubscription(...(args as [])),
  normalizeSubscription: (...args: unknown[]) => mockNormalizeSubscription(...(args as [])),
  updateSubscription: (...args: unknown[]) => mockStripeUpdateSubscription(...(args as [])),
  verifyWebhookSignature: (...args: unknown[]) => mockVerifyWebhookSignature(...(args as [])),
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

describe('Stripe Bond Adapter', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
    vi.stubEnv('API_ORIGIN', 'https://api.example.com')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')

    // Default mock implementations
    mockGetCheckoutSession.mockResolvedValue(mockCheckoutSessionResult)
    mockGetSubscription.mockResolvedValue(mockSubscriptionResult)
    mockNormalizeSubscription.mockReturnValue({
      provider: 'stripe',
      subscriptionId: 'sub_abc123',
      productId: 'prod_premium',
      status: 'active',
      isActive: true,
      currentPeriodStart: 1700000000000,
      currentPeriodEnd: 1702592000000,
      willRenew: true,
      canceledAt: undefined,
      rawData: { customer: 'cus_customer1', ...mockSubscriptionResult },
    })
    mockCreateCheckoutSession.mockResolvedValue({
      id: 'cs_new_session',
      url: 'https://checkout.stripe.com/pay/cs_new_session',
    })
    mockStripeUpdateSubscription.mockResolvedValue(mockSubscriptionResult)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  // ─── verifySubscription ──────────────────────────────────────────────────

  describe('verifySubscription', () => {
    it('should resolve a checkout session ID (cs_ prefix) to a subscription', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('cs_test_session')

      expect(mockGetCheckoutSession).toHaveBeenCalledWith('cs_test_session')
      expect(mockGetSubscription).toHaveBeenCalledWith('sub_abc123')
      expect(result).not.toBeNull()
      expect(result!.productId).toBe('prod_premium')
      expect(result!.transactionId).toBe('sub_abc123')
    })

    it('should return null when checkout session has no subscription', async () => {
      mockGetCheckoutSession.mockResolvedValue({
        id: 'cs_no_sub',
        url: 'https://checkout.stripe.com/pay/cs_no_sub',
        subscription: undefined,
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('cs_no_sub')

      expect(mockGetCheckoutSession).toHaveBeenCalledWith('cs_no_sub')
      expect(mockGetSubscription).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should call getSubscription directly for a sub_ prefix ID', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_abc123')

      expect(mockGetCheckoutSession).not.toHaveBeenCalled()
      expect(mockGetSubscription).toHaveBeenCalledWith('sub_abc123')
      expect(result).not.toBeNull()
      expect(result!.productId).toBe('prod_premium')
      expect(result!.transactionId).toBe('sub_abc123')
    })

    it('should return verified subscription with correct fields', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_abc123')

      expect(result).toEqual({
        productId: 'prod_premium',
        transactionId: 'sub_abc123',
        expiresAt: new Date(1702592000000).toISOString(),
        autoRenews: true,
        data: {
          customerId: 'cus_customer1',
        },
      })
    })

    it('should return null when getSubscription returns null', async () => {
      mockGetSubscription.mockResolvedValue(null as unknown as SubscriptionResult)

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_nonexistent')

      expect(result).toBeNull()
    })

    it('should return null and log error when an exception is thrown', async () => {
      mockGetSubscription.mockRejectedValue(new Error('Stripe API failure'))

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_broken')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe bondAdapter verifySubscription error:',
        expect.any(Error),
      )
    })

    it('should handle expiresAt as undefined when currentPeriodEnd is missing', async () => {
      mockNormalizeSubscription.mockReturnValue({
        provider: 'stripe',
        subscriptionId: 'sub_abc123',
        productId: 'prod_premium',
        status: 'active',
        isActive: true,
        currentPeriodEnd: undefined,
        willRenew: true,
        rawData: { customer: 'cus_customer1' },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_abc123')

      expect(result).not.toBeNull()
      expect(result!.expiresAt).toBeUndefined()
    })

    it('should extract customerId from rawData when it is a string', async () => {
      mockNormalizeSubscription.mockReturnValue({
        provider: 'stripe',
        subscriptionId: 'sub_abc123',
        productId: 'prod_premium',
        status: 'active',
        isActive: true,
        currentPeriodEnd: 1702592000000,
        willRenew: false,
        rawData: { customer: 'cus_specific_id' },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_abc123')

      expect(result!.data).toEqual({ customerId: 'cus_specific_id' })
    })

    it('should set customerId to undefined when rawData.customer is not a string', async () => {
      mockNormalizeSubscription.mockReturnValue({
        provider: 'stripe',
        subscriptionId: 'sub_abc123',
        productId: 'prod_premium',
        status: 'active',
        isActive: true,
        currentPeriodEnd: 1702592000000,
        willRenew: true,
        rawData: { customer: { id: 'cus_object' } },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.verifySubscription!('sub_abc123')

      expect(result!.data).toEqual({ customerId: undefined })
    })
  })

  // ─── handleWebhookEvent ──────────────────────────────────────────────────

  describe('handleWebhookEvent', () => {
    it('should return null if body is missing', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: undefined,
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe bondAdapter handleWebhookEvent: missing body or stripe-signature.',
      )
    })

    it('should return null if stripe-signature header is missing', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{"some":"data"}',
        headers: {},
      })

      expect(result).toBeNull()
    })

    it('should use rawBody if available', async () => {
      const rawBody = '{"raw":"body"}'
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.handleWebhookEvent!({
        body: '{"other":"data"}',
        rawBody,
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(rawBody, 'sig_valid')
    })

    it('should map customer.subscription.created to "created"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result).not.toBeNull()
      expect(result!.type).toBe('created')
    })

    it('should map customer.subscription.updated to "renewed"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('renewed')
    })

    it('should map customer.subscription.deleted to "canceled"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: 1701000000,
            cancel_at_period_end: true,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('canceled')
      expect(result!.subscription!.autoRenews).toBe(false)
    })

    it('should map customer.subscription.paused to "paused"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.paused',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('paused')
    })

    it('should map customer.subscription.resumed to "renewed"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.resumed',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('renewed')
    })

    it('should map customer.subscription.pending_update_applied to "renewed"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.pending_update_applied',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('renewed')
    })

    it('should map customer.subscription.pending_update_expired to "expired"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.pending_update_expired',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('expired')
    })

    it('should map customer.subscription.trial_will_end to "trial_ending"', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.type).toBe('trial_ending')
    })

    it('should return event type as-is for non-subscription events', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: { object: {} },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result).toEqual({ type: 'invoice.payment_succeeded' })
      expect(result!.subscription).toBeUndefined()
    })

    it('should extract subscription data from webhook payload', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            customer: 'cus_webhook_customer',
            items: {
              data: [{ price: { product: 'prod_webhook' }, current_period_end: 1702592000 }],
            },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription).toEqual({
        customerId: 'cus_webhook_customer',
        productId: 'prod_webhook',
        expiresAt: new Date(1702592000 * 1000).toISOString(),
        autoRenews: true,
      })
    })

    it('should set autoRenews to false when subscription is deleted', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription!.autoRenews).toBe(false)
    })

    it('should set autoRenews to false when cancel_at_period_end is true', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: null,
            cancel_at_period_end: true,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription!.autoRenews).toBe(false)
    })

    it('should set autoRenews to false when canceled_at is set', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' }, current_period_end: 1702592000 }] },
            canceled_at: 1701000000,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription!.autoRenews).toBe(false)
    })

    it('should handle array stripe-signature header', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'invoice.created',
        data: { object: {} },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': ['sig_first', 'sig_second'] },
      })

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith('{}', 'sig_first')
    })

    it('should handle missing product in webhook subscription items', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: {} }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription!.productId).toBeUndefined()
    })

    it('should handle missing period end in webhook subscription items', async () => {
      mockVerifyWebhookSignature.mockReturnValue({
        type: 'customer.subscription.created',
        data: {
          object: {
            customer: 'cus_123',
            items: { data: [{ price: { product: 'prod_123' } }] },
            canceled_at: null,
            cancel_at_period_end: false,
          },
        },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      expect(result!.subscription!.expiresAt).toBeUndefined()
    })

    it('should return null and log error when verification throws', async () => {
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw new Error('Webhook signature verification failed')
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.handleWebhookEvent!({
        body: '{}',
        headers: { 'stripe-signature': 'sig_invalid' },
      })

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe bondAdapter handleWebhookEvent error:',
        expect.any(Error),
      )
    })
  })

  // ─── updateSubscription ──────────────────────────────────────────────────

  describe('updateSubscription', () => {
    it('should create a checkout session with idempotency key when no existing subscription', async () => {
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'price_new_plan',
      })

      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_new_plan',
          idempotencyKey: expect.any(String),
        }),
      )
      expect(result.updated).toBe(false)
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_new_session')
    })

    it('should generate a SHA-256 idempotency key from userId + priceId + time window', async () => {
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.updateSubscription!({
        userId: 'user_idempotent',
        newProductId: 'price_plan_x',
      })

      const call = mockCreateCheckoutSession.mock.calls[0][0] as {
        idempotencyKey: string
      }

      // Verify the key is a valid hex SHA-256 hash (64 hex characters)
      expect(call.idempotencyKey).toMatch(/^[a-f0-9]{64}$/)

      // Verify the key is deterministic for the same time window
      const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000))
      const expectedKey = crypto
        .createHash('sha256')
        .update(`checkout:user_idempotent:price_plan_x:${timeWindow}`)
        .digest('hex')
      expect(call.idempotencyKey).toBe(expectedKey)
    })

    it('should use subscriptionId as the query param name in successUrl', async () => {
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.updateSubscription!({
        userId: 'user_url_test',
        newProductId: 'price_abc',
      })

      const call = mockCreateCheckoutSession.mock.calls[0][0] as {
        successUrl: string
      }

      expect(call.successUrl).toContain('subscriptionId={CHECKOUT_SESSION_ID}')
      expect(call.successUrl).not.toContain('sessionId=')
      expect(call.successUrl).toBe(
        'https://api.example.com/api/users/user_url_test/verify-payment/stripe?subscriptionId={CHECKOUT_SESSION_ID}',
      )
    })

    it('should use cancelUrl from APP_ORIGIN', async () => {
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.updateSubscription!({
        userId: 'user_123',
        newProductId: 'price_abc',
      })

      const call = mockCreateCheckoutSession.mock.calls[0][0] as {
        cancelUrl: string
      }

      expect(call.cancelUrl).toBe('https://app.example.com')
    })

    it('should update existing subscription instead of creating a new checkout', async () => {
      mockFindByUserId.mockResolvedValue({
        data: { subscriptionId: 'sub_existing' },
        transactionId: 'txn_existing',
      })
      mockGetSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_existing',
        items: {
          data: [{ id: 'si_existing_item', price: { product: 'prod_old_plan' } }],
        },
      })
      mockStripeUpdateSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_existing',
        items: {
          data: [{ id: 'si_existing_item', price: { product: 'prod_new_plan' } }],
        },
        cancel_at_period_end: false,
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_with_sub',
        newProductId: 'price_new_plan',
        previousProductId: 'price_old_plan',
      })

      expect(mockFindByUserId).toHaveBeenCalledWith('user_with_sub', 'stripe')
      expect(mockGetSubscription).toHaveBeenCalledWith('sub_existing')
      expect(mockStripeUpdateSubscription).toHaveBeenCalledWith('sub_existing', {
        items: [
          {
            id: 'si_existing_item',
            price: 'price_new_plan',
          },
        ],
      })
      expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
      expect(result.updated).toBe(true)
    })

    it('should return subscription details when updating an existing subscription', async () => {
      const periodEnd = 1702592000
      mockFindByUserId.mockResolvedValue({
        data: { subscriptionId: 'sub_existing' },
      })
      mockGetSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_existing',
        items: { data: [{ id: 'si_item', price: { product: 'prod_old' } }] },
      })
      mockStripeUpdateSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_existing',
        items: {
          data: [{ id: 'si_item', price: { product: 'prod_new' }, current_period_end: periodEnd }],
        },
        cancel_at_period_end: false,
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_details',
        newProductId: 'price_new',
      })

      expect(result.updated).toBe(true)
      expect(result.subscription).toBeDefined()
      expect(result.subscription!.expiresAt).toBe(new Date(periodEnd * 1000).toISOString())
      expect(result.subscription!.autoRenews).toBe(true)
    })

    it('should fall through to checkout when subscription has no items', async () => {
      mockFindByUserId.mockResolvedValue({
        data: { subscriptionId: 'sub_empty_items' },
      })
      mockGetSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_empty_items',
        items: { data: [] },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_empty',
        newProductId: 'price_new',
      })

      expect(mockCreateCheckoutSession).toHaveBeenCalled()
      expect(result.updated).toBe(false)
      expect(result.checkoutUrl).toBeDefined()
    })

    it('should return { updated: false } when checkout session creation fails', async () => {
      mockFindByUserId.mockResolvedValue(null)
      mockCreateCheckoutSession.mockResolvedValue({
        id: '',
        url: null,
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_fail',
        newProductId: 'price_fail',
      })

      expect(result).toEqual({ updated: false })
    })

    it('should return { updated: false } and log error when an exception is thrown', async () => {
      mockFindByUserId.mockRejectedValue(new Error('Database error'))

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.updateSubscription!({
        userId: 'user_error',
        newProductId: 'price_error',
      })

      expect(result).toEqual({ updated: false })
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe bondAdapter updateSubscription error:',
        expect.any(Error),
      )
    })

    it('should fall back to ORIGIN env var when API_ORIGIN and APP_ORIGIN are not set', async () => {
      vi.stubEnv('API_ORIGIN', '')
      vi.stubEnv('APP_ORIGIN', '')
      vi.stubEnv('ORIGIN', 'https://fallback.example.com')
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      await paymentProvider.updateSubscription!({
        userId: 'user_fallback',
        newProductId: 'price_fb',
      })

      const call = mockCreateCheckoutSession.mock.calls[0][0] as {
        successUrl: string
        cancelUrl: string
      }

      expect(call.successUrl).toContain('https://fallback.example.com')
      expect(call.cancelUrl).toBe('https://fallback.example.com')
    })
  })

  // ─── cancelSubscription ──────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('should call updateSubscription with cancel_at_period_end', async () => {
      mockFindByUserId.mockResolvedValue({
        data: { subscriptionId: 'sub_to_cancel' },
      })
      mockGetSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_to_cancel',
      })
      mockStripeUpdateSubscription.mockResolvedValue({
        ...mockSubscriptionResult,
        id: 'sub_to_cancel',
        cancel_at_period_end: true,
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_cancel' })

      expect(mockFindByUserId).toHaveBeenCalledWith('user_cancel', 'stripe')
      expect(mockGetSubscription).toHaveBeenCalledWith('sub_to_cancel')
      expect(mockStripeUpdateSubscription).toHaveBeenCalledWith('sub_to_cancel', {
        cancel_at_period_end: true,
      })
      expect(result).toBe(true)
    })

    it('should return false when no payment record service is available', async () => {
      // Override the bond mock to return null for records
      const { get } = await import('@molecule/api-bond')
      vi.mocked(get).mockReturnValueOnce(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_no_records' })

      expect(result).toBe(false)
    })

    it('should return false when no subscription is found for the user', async () => {
      mockFindByUserId.mockResolvedValue(null)

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_no_sub' })

      expect(result).toBe(false)
      expect(mockGetSubscription).not.toHaveBeenCalled()
    })

    it('should return false when payment record has no subscriptionId', async () => {
      mockFindByUserId.mockResolvedValue({
        data: { someOtherField: 'value' },
      })

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_no_sub_id' })

      expect(result).toBe(false)
      expect(mockGetSubscription).not.toHaveBeenCalled()
    })

    it('should return false when getSubscription returns null', async () => {
      mockFindByUserId.mockResolvedValue({
        data: { subscriptionId: 'sub_gone' },
      })
      mockGetSubscription.mockResolvedValue(null as unknown as SubscriptionResult)

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_gone_sub' })

      expect(result).toBe(false)
      expect(mockStripeUpdateSubscription).not.toHaveBeenCalled()
    })

    it('should return false and log error when an exception is thrown', async () => {
      mockFindByUserId.mockRejectedValue(new Error('Cancel failed'))

      const { paymentProvider } = await import('../bondAdapter.js')

      const result = await paymentProvider.cancelSubscription!({ userId: 'user_error' })

      expect(result).toBe(false)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Stripe bondAdapter cancelSubscription error:',
        expect.any(Error),
      )
    })
  })

  // ─── Provider metadata ──────────────────────────────────────────────────

  describe('provider metadata', () => {
    it('should have providerName set to "stripe"', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      expect(paymentProvider.providerName).toBe('stripe')
    })

    it('should have verifyFlow set to "subscription"', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      expect(paymentProvider.verifyFlow).toBe('subscription')
    })

    it('should have notificationFlow set to "webhook"', async () => {
      const { paymentProvider } = await import('../bondAdapter.js')
      expect(paymentProvider.notificationFlow).toBe('webhook')
    })
  })
})
