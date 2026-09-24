/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the `stripe` SDK (the network) is mocked.
 *
 * @module
 */
const { sessionsCreate, sessionsRetrieve, subscriptionsRetrieve } = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  sessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: vi.fn(function () {
    return {
      checkout: { sessions: { create: sessionsCreate, retrieve: sessionsRetrieve } },
      subscriptions: { retrieve: subscriptionsRetrieve },
    }
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import type { PaymentProviderInterface } from '@molecule/api-payments'
import { resolveCheckoutRedirectUrls } from '@molecule/api-payments'

import { createCheckoutSession, paymentProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'test-key')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
    vi.stubEnv('STRIPE_PRICE_ID_PRO', 'price_pro_monthly')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates a checkout session and verifies it server-side through the bond', async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    sessionsCreate.mockResolvedValueOnce({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    })
    sessionsRetrieve.mockResolvedValueOnce({
      id: 'cs_test_1',
      url: null,
      subscription: 'sub_1',
    })
    subscriptionsRetrieve.mockResolvedValueOnce({
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            id: 'si_1',
            quantity: 1,
            price: { id: 'price_pro_monthly', product: 'prod_pro' },
            current_period_start: periodEnd - 30 * 24 * 3600,
            current_period_end: periodEnd,
          },
        ],
      },
    })

    bond('payments', 'stripe', paymentProvider)

    const userId = 'user-123'
    const { successUrl, cancelUrl } = resolveCheckoutRedirectUrls({
      provider: 'stripe',
      sessionIdToken: '{CHECKOUT_SESSION_ID}',
    })
    const session = await createCheckoutSession({
      priceId: process.env.STRIPE_PRICE_ID_PRO ?? 'price_pro_monthly',
      successUrl,
      cancelUrl,
      clientReferenceId: userId,
      metadata: { userId },
    })

    const stripe = get<PaymentProviderInterface>('payments', 'stripe')
    const verified = await stripe?.verifySubscription?.(session.id)

    expect(session.url).toBe('https://checkout.stripe.com/c/pay/cs_test_1')
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        success_url:
          'https://app.example.com/plan-updated?provider=stripe&sessionId={CHECKOUT_SESSION_ID}',
        client_reference_id: 'user-123',
        metadata: { userId: 'user-123' },
      }),
      undefined,
    )
    expect(sessionsRetrieve).toHaveBeenCalledWith('cs_test_1')
    expect(verified).toMatchObject({
      productId: 'prod_pro',
      priceId: 'price_pro_monthly',
      transactionId: 'sub_1',
      expiresAt: new Date(periodEnd * 1000).toISOString(),
      autoRenews: true,
    })
  })
})
