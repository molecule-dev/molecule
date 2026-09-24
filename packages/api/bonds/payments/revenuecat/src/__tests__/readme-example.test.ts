/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written, with the REAL env config provider. Only the
 * network (`fetch` to the RevenueCat v1 REST API) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import { setProvider as setConfigProvider } from '@molecule/api-config'
import { provider as envConfig } from '@molecule/api-config-env'
import type { PaymentProviderInterface } from '@molecule/api-payments'

import { paymentProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('verifies the authenticated user entitlement through the named bond', async () => {
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            request_date: '2026-09-24T00:00:00Z',
            subscriber: {
              original_app_user_id: 'user-123',
              entitlements: {
                pro: {
                  expires_date: expires,
                  product_identifier: 'com.example.pro.monthly',
                  purchase_date: '2026-09-01T00:00:00Z',
                },
              },
              subscriptions: {
                'com.example.pro.monthly': {
                  expires_date: expires,
                  purchase_date: '2026-09-01T00:00:00Z',
                  is_sandbox: false,
                  store: 'app_store',
                  store_transaction_id: 2000000123,
                  unsubscribe_detected_at: null,
                  refunded_at: null,
                },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setConfigProvider(envConfig)
    bond('payments', 'revenuecat', paymentProvider)

    const authenticatedUserId = 'user-123'
    const revenuecat = get<PaymentProviderInterface>('payments', 'revenuecat')
    const verified = await revenuecat?.verifyReceipt?.(authenticatedUserId, 'pro')

    expect(verified).toMatchObject({
      productId: 'com.example.pro.monthly',
      priceId: 'pro',
      transactionId: '2000000123',
      expiresAt: expires,
      autoRenews: true,
    })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.revenuecat.com/v1/subscribers/user-123')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
  })
})
