/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the Google Play SDK
 * (`@googleapis/androidpublisher`, the network) is mocked.
 *
 * @module
 */
const { subscriptionsV2Get, subscriptionsAcknowledge } = vi.hoisted(() => ({
  subscriptionsV2Get: vi.fn(),
  subscriptionsAcknowledge: vi.fn(),
}))

vi.mock('@googleapis/androidpublisher', () => ({
  androidpublisher: vi.fn(function () {
    return {
      purchases: {
        subscriptionsv2: { get: subscriptionsV2Get },
        subscriptions: { acknowledge: subscriptionsAcknowledge },
      },
    }
  }),
  auth: {
    JWT: vi.fn(function () {
      return {}
    }),
  },
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import type { PaymentProviderInterface } from '@molecule/api-payments'

import { paymentProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLAY_PACKAGE_NAME', 'com.example.app')
    vi.stubEnv(
      'GOOGLE_API_SERVICE_KEY_OBJECT',
      JSON.stringify({ client_email: 'play@example.iam.gserviceaccount.com', private_key: 'test' }),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('verifies and acknowledges a Play subscription through the named bond', async () => {
    const expiryTime = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    subscriptionsV2Get.mockResolvedValueOnce({
      data: {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        latestOrderId: 'GPA.1234-5678-9012-34567',
        lineItems: [
          {
            productId: 'pro_monthly',
            expiryTime,
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      },
    })
    subscriptionsAcknowledge.mockResolvedValueOnce({ data: {} })

    bond('payments', 'google', paymentProvider)

    const purchaseToken = 'purchase-token-from-play-billing'
    const google = get<PaymentProviderInterface>('payments', 'google')
    const verified = await google?.verifyPurchase?.(purchaseToken, 'pro_monthly')

    expect(verified).toMatchObject({
      productId: 'pro_monthly',
      transactionId: 'GPA.1234-5678-9012-34567',
      expiresAt: expiryTime,
      autoRenews: true,
    })
    expect(subscriptionsV2Get).toHaveBeenCalledWith({
      packageName: 'com.example.app',
      token: 'purchase-token-from-play-billing',
    })
    expect(subscriptionsAcknowledge).toHaveBeenCalledWith({
      packageName: 'com.example.app',
      subscriptionId: 'pro_monthly',
      token: 'purchase-token-from-play-billing',
    })
  })
})
