/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the Stripe bond, with only
 * the `stripe` SDK (the network) mocked, as the bond's own unit tests do.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sessionsRetrieve, subscriptionsRetrieve } = vi.hoisted(() => ({
  sessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: vi.fn(function () {
    return {
      checkout: { sessions: { retrieve: sessionsRetrieve } },
      subscriptions: { retrieve: subscriptionsRetrieve },
    }
  }),
}))

import { bond, get } from '@molecule/api-bond'
import { paymentProvider as stripe } from '@molecule/api-payments-stripe'

import type { PaymentProviderInterface } from '../index.js'
import { isConfigNotConfiguredError } from '../index.js'

const verifyPayment = async (userId: string, opaqueId: string) => {
  const payments = get<PaymentProviderInterface>('payments', 'stripe')
  try {
    const sub = (await payments?.verifySubscription?.(opaqueId)) ?? null
    if (!sub) return { statusCode: 402, body: { error: 'No active subscription.' } }
    return {
      statusCode: 200,
      body: { userId, productId: sub.productId, expiresAt: sub.expiresAt },
    }
  } catch (error) {
    if (isConfigNotConfiguredError(error)) {
      return { statusCode: error.statusCode, body: { errorKey: error.errorKey } }
    }
    throw error
  }
}

const subscription = (status: string) => ({
  id: 'sub_123',
  status,
  customer: 'cus_123',
  cancel_at_period_end: false,
  canceled_at: null,
  items: {
    data: [
      {
        id: 'si_1',
        quantity: 1,
        price: { id: 'price_pro_monthly', product: 'prod_pro' },
        current_period_start: 1_700_000_000,
        current_period_end: 4_102_444_800,
      },
    ],
  },
})

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'test-key')
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    sessionsRetrieve.mockReset()
    subscriptionsRetrieve.mockReset()
    sessionsRetrieve.mockResolvedValue({ id: 'cs_test_a1b2c3', url: null, subscription: 'sub_123' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('grants only when the bonded provider verifies an active subscription', async () => {
    subscriptionsRetrieve.mockResolvedValue(subscription('active'))
    bond('payments', 'stripe', stripe)

    const result = await verifyPayment('user-123', 'cs_test_a1b2c3')

    expect(sessionsRetrieve).toHaveBeenCalledWith('cs_test_a1b2c3')
    expect(result).toEqual({
      statusCode: 200,
      body: { userId: 'user-123', productId: 'prod_pro', expiresAt: '2100-01-01T00:00:00.000Z' },
    })
  })

  it('returns 402 (grants nothing) for a past_due subscription', async () => {
    subscriptionsRetrieve.mockResolvedValue(subscription('past_due'))
    bond('payments', 'stripe', stripe)

    const result = await verifyPayment('user-123', 'cs_test_a1b2c3')
    expect(result.statusCode).toBe(402)
  })
})
