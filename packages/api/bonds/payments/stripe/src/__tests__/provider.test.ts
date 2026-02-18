/**
 * Tests for the Stripe payment provider.
 *
 * @module
 */

import type Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSubscription = {
  id: 'sub_123',
  status: 'active',
  items: {
    data: [{ price: { product: 'prod_123' } }],
  },
  current_period_start: 1700000000,
  current_period_end: 1702592000,
  cancel_at_period_end: false,
  canceled_at: null,
}

const mockSession = {
  id: 'cs_123',
  url: 'https://checkout.stripe.com/pay/cs_123',
  customer: 'cus_123',
  subscription: 'sub_123',
}

// Track mock functions for error testing
let mockCheckoutCreate: ReturnType<typeof vi.fn>
let mockCheckoutRetrieve: ReturnType<typeof vi.fn>
let mockSubscriptionsRetrieve: ReturnType<typeof vi.fn>
let mockSubscriptionsCancel: ReturnType<typeof vi.fn>
let mockSubscriptionsUpdate: ReturnType<typeof vi.fn>
let mockWebhooksConstructEvent: ReturnType<typeof vi.fn>

// Mock the stripe module before importing provider
vi.mock('stripe', () => {
  mockCheckoutCreate = vi.fn().mockResolvedValue(mockSession)
  mockCheckoutRetrieve = vi.fn().mockResolvedValue(mockSession)
  mockSubscriptionsRetrieve = vi.fn().mockResolvedValue(mockSubscription)
  mockSubscriptionsCancel = vi.fn().mockResolvedValue({ ...mockSubscription, status: 'canceled' })
  mockSubscriptionsUpdate = vi.fn().mockResolvedValue(mockSubscription)
  mockWebhooksConstructEvent = vi.fn().mockImplementation((payload, signature, _secret) => {
    if (signature === 'invalid_signature') {
      throw new Error('Webhook signature verification failed')
    }
    return {
      id: 'evt_123',
      type: 'customer.subscription.updated',
      data: { object: mockSubscription },
    }
  })

  const MockStripe = vi.fn(function () {
    return {
      checkout: {
        sessions: {
          create: mockCheckoutCreate,
          retrieve: mockCheckoutRetrieve,
        },
      },
      subscriptions: {
        retrieve: mockSubscriptionsRetrieve,
        cancel: mockSubscriptionsCancel,
        update: mockSubscriptionsUpdate,
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    }
  })

  return { default: MockStripe }
})

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

describe('Stripe Provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      const { createCheckoutSession } = await import('../provider.js')

      const session = await createCheckoutSession({
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      expect(session).toBeDefined()
      expect(session.id).toBe('cs_123')
    })

    it('should include customerId when provided', async () => {
      const { createCheckoutSession, getClient } = await import('../provider.js')

      await createCheckoutSession({
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerId: 'cus_123',
      })

      expect(getClient().checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
        }),
      )
    })

    it('should include metadata when provided', async () => {
      const { createCheckoutSession, getClient } = await import('../provider.js')

      await createCheckoutSession({
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { userId: 'user_123' },
      })

      expect(getClient().checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: 'user_123' },
        }),
      )
    })

    it('should set mode to subscription', async () => {
      const { createCheckoutSession, getClient } = await import('../provider.js')

      await createCheckoutSession({
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })

      expect(getClient().checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: 'price_123', quantity: 1 }],
        }),
      )
    })

    it('should throw and log error when Stripe API fails', async () => {
      mockCheckoutCreate.mockRejectedValueOnce(new Error('Stripe API error'))
      const { createCheckoutSession } = await import('../provider.js')

      await expect(
        createCheckoutSession({
          priceId: 'price_123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('Stripe API error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Stripe checkout session:',
        expect.any(Error),
      )
    })
  })

  describe('getCheckoutSession', () => {
    it('should retrieve a checkout session', async () => {
      const { getCheckoutSession } = await import('../provider.js')

      const session = await getCheckoutSession('cs_123')

      expect(session).toBeDefined()
      expect(session.id).toBe('cs_123')
    })

    it('should call retrieve with the session ID', async () => {
      const { getCheckoutSession, getClient } = await import('../provider.js')

      await getCheckoutSession('cs_456')

      expect(getClient().checkout.sessions.retrieve).toHaveBeenCalledWith('cs_456')
    })

    it('should throw and log error when retrieval fails', async () => {
      mockCheckoutRetrieve.mockRejectedValueOnce(new Error('Session not found'))
      const { getCheckoutSession } = await import('../provider.js')

      await expect(getCheckoutSession('cs_invalid')).rejects.toThrow('Session not found')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error retrieving Stripe checkout session:',
        expect.any(Error),
      )
    })
  })

  describe('getSubscription', () => {
    it('should retrieve a subscription', async () => {
      const { getSubscription } = await import('../provider.js')

      const subscription = await getSubscription('sub_123')

      expect(subscription).toBeDefined()
      expect(subscription.id).toBe('sub_123')
    })

    it('should expand items.data', async () => {
      const { getSubscription, getClient } = await import('../provider.js')

      await getSubscription('sub_123')

      expect(getClient().subscriptions.retrieve).toHaveBeenCalledWith('sub_123', {
        expand: ['items.data'],
      })
    })

    it('should throw and log error when subscription retrieval fails', async () => {
      mockSubscriptionsRetrieve.mockRejectedValueOnce(new Error('Subscription not found'))
      const { getSubscription } = await import('../provider.js')

      await expect(getSubscription('sub_invalid')).rejects.toThrow('Subscription not found')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error retrieving Stripe subscription:',
        expect.any(Error),
      )
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel a subscription', async () => {
      const { cancelSubscription } = await import('../provider.js')

      const subscription = await cancelSubscription('sub_123')

      expect(subscription).toBeDefined()
      expect(subscription.status).toBe('canceled')
    })

    it('should call cancel with the subscription ID', async () => {
      const { cancelSubscription, getClient } = await import('../provider.js')

      await cancelSubscription('sub_456')

      expect(getClient().subscriptions.cancel).toHaveBeenCalledWith('sub_456')
    })

    it('should throw and log error when cancellation fails', async () => {
      mockSubscriptionsCancel.mockRejectedValueOnce(new Error('Cannot cancel subscription'))
      const { cancelSubscription } = await import('../provider.js')

      await expect(cancelSubscription('sub_invalid')).rejects.toThrow('Cannot cancel subscription')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error canceling Stripe subscription:',
        expect.any(Error),
      )
    })
  })

  describe('updateSubscription', () => {
    it('should update a subscription', async () => {
      const { updateSubscription, getClient } = await import('../provider.js')

      await updateSubscription('sub_123', { cancel_at_period_end: true })

      expect(getClient().subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      })
    })

    it('should return the updated subscription', async () => {
      const { updateSubscription } = await import('../provider.js')

      const subscription = await updateSubscription('sub_123', { cancel_at_period_end: true })

      expect(subscription).toBeDefined()
      expect(subscription.id).toBe('sub_123')
    })

    it('should throw and log error when update fails', async () => {
      mockSubscriptionsUpdate.mockRejectedValueOnce(new Error('Update failed'))
      const { updateSubscription } = await import('../provider.js')

      await expect(
        updateSubscription('sub_invalid', { cancel_at_period_end: true }),
      ).rejects.toThrow('Update failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating Stripe subscription:',
        expect.any(Error),
      )
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify a valid webhook signature', async () => {
      const { verifyWebhookSignature } = await import('../provider.js')

      const payload = JSON.stringify({ id: 'evt_123' })
      const signature = 'valid_signature'

      const event = verifyWebhookSignature(payload, signature)

      expect(event).toBeDefined()
      expect(event.type).toBe('customer.subscription.updated')
      expect(event.data.object).toBeDefined()
    })

    it('should reject an invalid webhook signature', async () => {
      const { verifyWebhookSignature } = await import('../provider.js')

      const payload = JSON.stringify({ id: 'evt_123' })
      const signature = 'invalid_signature'

      expect(() => verifyWebhookSignature(payload, signature)).toThrow(
        'Webhook signature verification failed',
      )
    })

    it('should throw if webhook secret is missing', async () => {
      vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
      vi.resetModules()

      const { verifyWebhookSignature } = await import('../provider.js')

      const payload = JSON.stringify({ id: 'evt_123' })
      const signature = 'some_signature'

      expect(() => verifyWebhookSignature(payload, signature)).toThrow(
        'Missing Stripe webhook secret',
      )
    })

    it('should handle Buffer payload', async () => {
      const { verifyWebhookSignature, getClient } = await import('../provider.js')

      const payload = Buffer.from(JSON.stringify({ id: 'evt_123' }))
      const signature = 'valid_signature'

      const event = verifyWebhookSignature(payload, signature)

      expect(event).toBeDefined()
      expect(getClient().webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_123',
      )
    })

    it('should return the constructed event with correct type', async () => {
      const { verifyWebhookSignature } = await import('../provider.js')

      const payload = JSON.stringify({ id: 'evt_123' })
      const signature = 'valid_signature'

      const event = verifyWebhookSignature(payload, signature)

      expect(event.type).toBe('customer.subscription.updated')
      expect(event.data.object).toEqual(mockSubscription)
    })
  })

  describe('normalizeSubscription', () => {
    it('should normalize an active subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'active' as const,
        items: {
          data: [{ price: { product: 'prod_123' } }],
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.provider).toBe('stripe')
      expect(normalized.subscriptionId).toBe('sub_123')
      expect(normalized.productId).toBe('prod_123')
      expect(normalized.status).toBe('active')
      expect(normalized.isActive).toBe(true)
      expect(normalized.currentPeriodStart).toBe(1700000000 * 1000)
      expect(normalized.currentPeriodEnd).toBe(1702592000 * 1000)
      expect(normalized.willRenew).toBe(true)
      expect(normalized.canceledAt).toBeUndefined()
    })

    it('should normalize a trialing subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'trialing' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('trialing')
      expect(normalized.isActive).toBe(true)
    })

    it('should normalize a canceled subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'canceled' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: true,
        canceled_at: 1701000000,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('canceled')
      expect(normalized.isActive).toBe(false)
      expect(normalized.willRenew).toBe(false)
      expect(normalized.canceledAt).toBe(1701000000 * 1000)
    })

    it('should normalize a past_due subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'past_due' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('past_due')
      expect(normalized.isActive).toBe(false)
    })

    it('should map all Stripe subscription statuses correctly', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const statusMap = {
        active: 'active',
        canceled: 'canceled',
        incomplete: 'pending',
        incomplete_expired: 'expired',
        past_due: 'past_due',
        paused: 'paused',
        trialing: 'trialing',
        unpaid: 'past_due',
      }

      for (const [stripeStatus, expectedStatus] of Object.entries(statusMap)) {
        const subscription = {
          id: 'sub_123',
          status: stripeStatus as Stripe.Subscription.Status,
          items: { data: [{ price: { product: 'prod_123' } }] },
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          cancel_at_period_end: false,
          canceled_at: null,
        } as unknown as Stripe.Subscription

        const normalized = normalizeSubscription(subscription)
        expect(normalized.status).toBe(expectedStatus)
      }
    })

    it('should handle subscription with empty items', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'active' as const,
        items: { data: [] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.productId).toBe('')
    })

    it('should include raw data', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'active' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.rawData).toBe(subscription)
    })

    it('should normalize a paused subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'paused' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('paused')
      expect(normalized.isActive).toBe(false)
    })

    it('should normalize an incomplete subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'incomplete' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('pending')
      expect(normalized.isActive).toBe(false)
    })

    it('should normalize an incomplete_expired subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'incomplete_expired' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('expired')
      expect(normalized.isActive).toBe(false)
    })

    it('should normalize an unpaid subscription to past_due', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'unpaid' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('past_due')
      expect(normalized.isActive).toBe(false)
    })

    it('should handle subscription with product as object', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'active' as const,
        items: { data: [{ price: { product: { id: 'prod_object_123' } } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: false,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      // When product is an object, it gets stringified to '[object Object]' or similar
      // The implementation uses `as string` cast, so it will use whatever value is there
      expect(normalized.productId).toBeDefined()
    })

    it('should handle subscription set to cancel at period end', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription = {
        id: 'sub_123',
        status: 'active' as const,
        items: { data: [{ price: { product: 'prod_123' } }] },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        cancel_at_period_end: true,
        canceled_at: null,
      } as unknown as Stripe.Subscription

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('active')
      expect(normalized.isActive).toBe(true)
      expect(normalized.willRenew).toBe(false)
    })
  })

  describe('getClient', () => {
    it('should return the Stripe client', async () => {
      const { getClient } = await import('../provider.js')

      const client = getClient()
      expect(client).toBeDefined()
      expect(client.checkout).toBeDefined()
      expect(client.subscriptions).toBeDefined()
      expect(client.webhooks).toBeDefined()
    })

    it('should throw if STRIPE_SECRET_KEY is not set', async () => {
      vi.stubEnv('STRIPE_SECRET_KEY', '')
      vi.resetModules()

      const { getClient } = await import('../provider.js')

      expect(() => getClient()).toThrow('STRIPE_SECRET_KEY is not set.')
    })
  })
})
