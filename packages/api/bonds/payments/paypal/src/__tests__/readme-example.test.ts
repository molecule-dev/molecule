/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to the PayPal REST
 * API) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, get } from '@molecule/api-bond'
import type { PaymentProviderInterface } from '@molecule/api-payments'
import { resolveCheckoutRedirectUrls } from '@molecule/api-payments'

import { createSubscription, paymentProvider } from '../index.js'

const SANDBOX = 'https://api-m.sandbox.paypal.com'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-client-id')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-client-secret')
    vi.stubEnv('PAYPAL_BASE_URL', '')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
    vi.stubEnv('PAYPAL_PLAN_ID_PRO', 'P-PRO')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a subscription and verifies it server-side through the bond', async () => {
    const nextBilling = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    const json = (body: unknown, status = 200): Response =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url === `${SANDBOX}/v1/oauth2/token`) {
        return json({ access_token: 'A21-test', expires_in: 3600 })
      }
      if (url === `${SANDBOX}/v1/billing/subscriptions` && init?.method === 'POST') {
        return json(
          {
            id: 'I-SUB1',
            status: 'APPROVAL_PENDING',
            plan_id: 'P-PRO',
            links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/approve/I-SUB1' }],
          },
          201,
        )
      }
      if (url === `${SANDBOX}/v1/billing/subscriptions/I-SUB1`) {
        return json({
          id: 'I-SUB1',
          status: 'ACTIVE',
          plan_id: 'P-PRO',
          subscriber: { payer_id: 'PAYER1' },
          billing_info: { next_billing_time: nextBilling },
        })
      }
      if (url === `${SANDBOX}/v1/billing/plans/P-PRO`) {
        return json({ id: 'P-PRO', product_id: 'PROD-PRO' })
      }
      return json({ name: 'RESOURCE_NOT_FOUND', message: url }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    bond('payments', 'paypal', paymentProvider)

    const userId = 'user-123'
    const { successUrl, cancelUrl } = resolveCheckoutRedirectUrls({ provider: 'paypal' })
    const checkout = await createSubscription({
      planId: process.env.PAYPAL_PLAN_ID_PRO ?? 'P-5ML4271244454362WXNWU5NQ',
      returnUrl: successUrl,
      cancelUrl,
      customId: userId,
    })

    const paypal = get<PaymentProviderInterface>('payments', 'paypal')
    const verified = await paypal?.verifySubscription?.(checkout.id)

    expect(checkout).toEqual({ id: 'I-SUB1', url: 'https://www.sandbox.paypal.com/approve/I-SUB1' })
    const createCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url) === `${SANDBOX}/v1/billing/subscriptions` && init?.method === 'POST',
    )
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      plan_id: 'P-PRO',
      custom_id: 'user-123',
      application_context: {
        return_url: 'https://app.example.com/plan-updated?provider=paypal',
        cancel_url: 'https://app.example.com',
        user_action: 'SUBSCRIBE_NOW',
      },
    })
    expect(verified).toMatchObject({
      productId: 'PROD-PRO',
      priceId: 'P-PRO',
      transactionId: 'I-SUB1',
      expiresAt: nextBilling,
      autoRenews: true,
    })
  })
})
