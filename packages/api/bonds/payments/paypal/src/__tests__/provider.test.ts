/**
 * Tests for the PayPal payment provider (REST client) with a mocked global fetch.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

/**
 * Builds a JSON `Response` the way PayPal's REST API returns it.
 * @param body - The JSON body.
 * @param status - The HTTP status (default 200).
 * @returns A fetch `Response`.
 */
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const mockSubscription = {
  id: 'I-BW452GLLEP1G',
  status: 'ACTIVE',
  plan_id: 'P-5ML4271244454362WXNWU5NQ',
  custom_id: 'user_123',
  create_time: '2026-07-01T10:00:00Z',
  status_update_time: '2026-07-01T10:05:00Z',
  subscriber: { payer_id: 'PAYER123', email_address: 'buyer@example.com' },
  billing_info: { next_billing_time: '2099-08-01T10:00:00Z' },
  links: [
    {
      href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-BW452GLLEP1G',
      rel: 'self',
    },
  ],
}

const mockPlan = {
  id: 'P-5ML4271244454362WXNWU5NQ',
  product_id: 'PROD-6XF24676R0513620K',
  name: 'Pro Monthly',
  status: 'ACTIVE',
}

const mockOrder = {
  id: '5O190127TN364715T',
  status: 'COMPLETED',
  intent: 'CAPTURE',
  payer: { payer_id: 'PAYER123', email_address: 'buyer@example.com' },
  purchase_units: [
    {
      reference_id: 'pro-lifetime',
      amount: { currency_code: 'USD', value: '12.00' },
      payments: {
        captures: [
          { id: '3C679366HH908993F', status: 'COMPLETED', create_time: '2026-07-01T10:00:00Z' },
        ],
      },
    },
  ],
}

describe('PayPal Provider', () => {
  const mockFetch = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('PAYPAL_CLIENT_ID', 'client_id_123')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'client_secret_123')
    vi.stubEnv('PAYPAL_WEBHOOK_ID', 'webhook_id_123')
    vi.stubGlobal('fetch', mockFetch)
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)

    // Default: every test gets a working OAuth token; individual tests
    // override the API-call behavior on top.
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/v1/oauth2/token')) {
        return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
      }
      return jsonResponse({})
    })
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('getBaseUrl', () => {
    it('defaults to the sandbox host', async () => {
      const { getBaseUrl } = await import('../provider.js')
      expect(getBaseUrl()).toBe('https://api-m.sandbox.paypal.com')
    })

    it('honors PAYPAL_BASE_URL and strips trailing slashes', async () => {
      vi.stubEnv('PAYPAL_BASE_URL', 'https://api-m.paypal.com/')
      const { getBaseUrl } = await import('../provider.js')
      expect(getBaseUrl()).toBe('https://api-m.paypal.com')
    })
  })

  describe('getAccessToken (config-missing handling)', () => {
    it('throws a config-tagged 503 error when PAYPAL_CLIENT_ID is unset', async () => {
      vi.stubEnv('PAYPAL_CLIENT_ID', '')
      const { getAccessToken } = await import('../provider.js')
      let caught: unknown
      try {
        await getAccessToken()
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect((caught as Error).message).toContain('PAYPAL_CLIENT_ID is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
    })

    it('throws a config-tagged 503 error when PAYPAL_CLIENT_SECRET is unset', async () => {
      vi.stubEnv('PAYPAL_CLIENT_SECRET', '')
      const { getAccessToken } = await import('../provider.js')
      let caught: unknown
      try {
        await getAccessToken()
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect((caught as Error).message).toContain('PAYPAL_CLIENT_SECRET is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
    })

    it('requests a token with HTTP basic auth and caches it', async () => {
      const { getAccessToken } = await import('../provider.js')
      const token = await getAccessToken()
      expect(token).toBe('access_token_123')

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        Authorization: `Basic ${Buffer.from('client_id_123:client_secret_123').toString('base64')}`,
      })
      expect(init.body).toBe('grant_type=client_credentials')

      // Second call is served from the cache — no additional fetch.
      await getAccessToken()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws a PayPalApiError when the token request fails', async () => {
      mockFetch.mockImplementation(async () =>
        jsonResponse(
          { error: 'invalid_client', error_description: 'Client Authentication failed' },
          401,
        ),
      )
      const { getAccessToken, PayPalApiError } = await import('../provider.js')
      await expect(getAccessToken()).rejects.toThrow(PayPalApiError)
      await expect(getAccessToken()).rejects.toThrow(/Client Authentication failed/)
    })
  })

  describe('createSubscription', () => {
    it('posts the plan + application context and returns the approval URL', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse({
          id: 'I-BW452GLLEP1G',
          status: 'APPROVAL_PENDING',
          links: [
            {
              href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123',
              rel: 'approve',
              method: 'GET',
            },
            {
              href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-BW452GLLEP1G',
              rel: 'self',
            },
          ],
        })
      })

      const { createSubscription } = await import('../provider.js')
      const result = await createSubscription({
        planId: 'P-5ML4271244454362WXNWU5NQ',
        returnUrl: 'https://api.example.com/api/users/user_123/verify-payment/paypal',
        cancelUrl: 'https://app.example.com',
        customId: 'user_123',
        idempotencyKey: 'idem_123',
      })

      expect(result.id).toBe('I-BW452GLLEP1G')
      expect(result.url).toBe(
        'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-123',
      )

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe('https://api-m.sandbox.paypal.com/v1/billing/subscriptions')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer access_token_123',
        'PayPal-Request-Id': 'idem_123',
      })
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      expect(body.plan_id).toBe('P-5ML4271244454362WXNWU5NQ')
      expect(body.custom_id).toBe('user_123')
      expect(body.application_context).toMatchObject({
        return_url: 'https://api.example.com/api/users/user_123/verify-payment/paypal',
        cancel_url: 'https://app.example.com',
      })
    })
  })

  describe('getSubscription', () => {
    it('gets the subscription by id', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse(mockSubscription)
      })

      const { getSubscription } = await import('../provider.js')
      const result = await getSubscription('I-BW452GLLEP1G')
      expect(result.id).toBe('I-BW452GLLEP1G')
      expect(result.status).toBe('ACTIVE')

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe('https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-BW452GLLEP1G')
      expect(init.method ?? 'GET').toBe('GET')
    })

    it('throws a PayPalApiError carrying status + debug_id on failure', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse(
          {
            name: 'RESOURCE_NOT_FOUND',
            message: 'The specified resource does not exist.',
            debug_id: 'debug_123',
          },
          404,
        )
      })

      const { getSubscription, PayPalApiError } = await import('../provider.js')
      let caught: unknown
      try {
        await getSubscription('I-DOESNOTEXIST')
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(PayPalApiError)
      expect((caught as InstanceType<typeof PayPalApiError>).status).toBe(404)
      expect((caught as InstanceType<typeof PayPalApiError>).paypalName).toBe('RESOURCE_NOT_FOUND')
      expect((caught as InstanceType<typeof PayPalApiError>).debugId).toBe('debug_123')
    })

    it('maps OAuth-style auth failures ({error, error_description}) — the auth-layer dialect', async () => {
      // Observed against the REAL sandbox: a bad bearer token on
      // /v2/checkout/orders answers 401 with `{error: 'invalid_token',
      // error_description: '...'}` — no name/message/debug_id. The bond must
      // surface the description, not fall back to a bare statusText.
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse(
          { error: 'invalid_token', error_description: 'Token signature verification failed' },
          401,
        )
      })

      const { getSubscription, PayPalApiError } = await import('../provider.js')
      let caught: unknown
      try {
        await getSubscription('I-BW452GLLEP1G')
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(PayPalApiError)
      expect((caught as InstanceType<typeof PayPalApiError>).status).toBe(401)
      expect((caught as InstanceType<typeof PayPalApiError>).paypalName).toBe('invalid_token')
      expect((caught as Error).message).toContain('Token signature verification failed')
    })
  })

  describe('cancelSubscription', () => {
    it('posts to /cancel and returns true on 204', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return new Response(null, { status: 204 })
      })

      const { cancelSubscription } = await import('../provider.js')
      await expect(cancelSubscription('I-BW452GLLEP1G', 'No longer needed')).resolves.toBe(true)

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe(
        'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-BW452GLLEP1G/cancel',
      )
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'No longer needed' })
    })
  })

  describe('reviseSubscription', () => {
    it('posts the new plan id and returns the approval URL when re-approval is required', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse({
          ...mockSubscription,
          links: [
            {
              href: 'https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-9',
              rel: 'approve',
            },
          ],
        })
      })

      const { reviseSubscription } = await import('../provider.js')
      const result = await reviseSubscription('I-BW452GLLEP1G', 'P-NEWPLAN123')

      expect(result.approveUrl).toBe(
        'https://www.sandbox.paypal.com/webapps/billing/subscriptions/update?ba_token=BA-9',
      )

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe(
        'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-BW452GLLEP1G/revise',
      )
      expect(JSON.parse(String(init.body))).toEqual({ plan_id: 'P-NEWPLAN123' })
    })
  })

  describe('orders', () => {
    it('createOrder posts the purchase unit and returns the approval URL', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse({
          id: '5O190127TN364715T',
          status: 'CREATED',
          links: [
            {
              href: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
              rel: 'approve',
            },
          ],
        })
      })

      const { createOrder } = await import('../provider.js')
      const result = await createOrder({
        amount: '12.00',
        referenceId: 'pro-lifetime',
        returnUrl: 'https://api.example.com/api/users/user_123/verify-payment/paypal',
        cancelUrl: 'https://app.example.com',
      })

      expect(result.id).toBe('5O190127TN364715T')
      expect(result.url).toBe('https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T')

      const [, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      expect(body.intent).toBe('CAPTURE')
      const units = body.purchase_units as Array<Record<string, unknown>>
      expect(units[0].reference_id).toBe('pro-lifetime')
      expect(units[0].amount).toEqual({ currency_code: 'USD', value: '12.00' })
    })

    it('getOrder gets the order by id', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse(mockOrder)
      })

      const { getOrder } = await import('../provider.js')
      const order = await getOrder('5O190127TN364715T')
      expect(order.status).toBe('COMPLETED')
    })

    it('captureOrder posts to /capture', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse(mockOrder, 201)
      })

      const { captureOrder } = await import('../provider.js')
      const order = await captureOrder('5O190127TN364715T')
      expect(order.status).toBe('COMPLETED')

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture',
      )
      expect(init.method).toBe('POST')
    })
  })

  describe('catalog (createProduct / createPlan / getPlan)', () => {
    it('creates a product then a plan under it', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        if (url.includes('/v1/catalogs/products')) {
          return jsonResponse({ id: 'PROD-6XF24676R0513620K' }, 201)
        }
        if (url.includes('/v1/billing/plans') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>
          expect(body.product_id).toBe('PROD-6XF24676R0513620K')
          const cycles = body.billing_cycles as Array<Record<string, unknown>>
          expect(cycles[0].tenure_type).toBe('REGULAR')
          return jsonResponse({ id: 'P-5ML4271244454362WXNWU5NQ' }, 201)
        }
        return jsonResponse(mockPlan)
      })

      const { createProduct, createPlan, getPlan } = await import('../provider.js')
      const product = await createProduct({ name: 'Pro' })
      expect(product.id).toBe('PROD-6XF24676R0513620K')

      const plan = await createPlan({
        productId: product.id,
        name: 'Pro Monthly',
        interval: 'MONTH',
        price: '12.00',
      })
      expect(plan.id).toBe('P-5ML4271244454362WXNWU5NQ')

      const fetched = await getPlan(plan.id)
      expect(fetched.product_id).toBe('PROD-6XF24676R0513620K')
    })
  })

  describe('verifyWebhookSignature', () => {
    it('throws a config-tagged 503 error when PAYPAL_WEBHOOK_ID is unset', async () => {
      vi.stubEnv('PAYPAL_WEBHOOK_ID', '')
      const { verifyWebhookSignature } = await import('../provider.js')
      let caught: unknown
      try {
        await verifyWebhookSignature({
          authAlgo: 'SHA256withRSA',
          certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123',
          transmissionId: 'transmission_123',
          transmissionSig: 'sig_123',
          transmissionTime: '2026-07-01T10:00:00Z',
          webhookEvent: {
            id: 'WH-123',
            event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
            resource: {},
          },
        })
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect((caught as Error).message).toContain('PAYPAL_WEBHOOK_ID is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
    })

    it('posts the transmission headers + webhook id and returns the parsed event on SUCCESS', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse({ verification_status: 'SUCCESS' })
      })

      const { verifyWebhookSignature } = await import('../provider.js')
      const event = await verifyWebhookSignature({
        authAlgo: 'SHA256withRSA',
        certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123',
        transmissionId: 'transmission_123',
        transmissionSig: 'sig_123',
        transmissionTime: '2026-07-01T10:00:00Z',
        webhookEvent: {
          id: 'WH-123',
          event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
          resource: { id: 'I-BW452GLLEP1G' },
        },
      })

      expect(event).not.toBeNull()
      expect(event!.id).toBe('WH-123')
      expect(event!.type).toBe('BILLING.SUBSCRIPTION.ACTIVATED')
      expect(event!.resource).toEqual({ id: 'I-BW452GLLEP1G' })

      const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(url).toBe('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature')
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      expect(body.webhook_id).toBe('webhook_id_123')
      expect(body.transmission_id).toBe('transmission_123')
      expect(body.transmission_sig).toBe('sig_123')
      expect(body.transmission_time).toBe('2026-07-01T10:00:00Z')
      expect(body.auth_algo).toBe('SHA256withRSA')
      expect(body.cert_url).toBe('https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123')
    })

    it('returns null on FAILURE', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/v1/oauth2/token')) {
          return jsonResponse({ access_token: 'access_token_123', expires_in: 32400 })
        }
        return jsonResponse({ verification_status: 'FAILURE' })
      })

      const { verifyWebhookSignature } = await import('../provider.js')
      const event = await verifyWebhookSignature({
        authAlgo: 'SHA256withRSA',
        certUrl: 'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-123',
        transmissionId: 'transmission_123',
        transmissionSig: 'forged_sig',
        transmissionTime: '2026-07-01T10:00:00Z',
        webhookEvent: { id: 'WH-123', event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: {} },
      })
      expect(event).toBeNull()
    })
  })

  describe('normalizeSubscriptionStatus', () => {
    it('maps PayPal statuses to normalized statuses', async () => {
      const { normalizeSubscriptionStatus } = await import('../provider.js')
      expect(normalizeSubscriptionStatus('APPROVAL_PENDING')).toBe('pending')
      expect(normalizeSubscriptionStatus('APPROVED')).toBe('pending')
      expect(normalizeSubscriptionStatus('ACTIVE')).toBe('active')
      expect(normalizeSubscriptionStatus('SUSPENDED')).toBe('past_due')
      expect(normalizeSubscriptionStatus('CANCELLED')).toBe('canceled')
      expect(normalizeSubscriptionStatus('EXPIRED')).toBe('expired')
      expect(normalizeSubscriptionStatus('SOMETHING_NEW')).toBe('unknown')
      expect(normalizeSubscriptionStatus(undefined)).toBe('unknown')
    })
  })

  describe('normalizeSubscription', () => {
    it('normalizes an active subscription with plan enrichment', async () => {
      const { normalizeSubscription } = await import('../provider.js')
      const normalized = normalizeSubscription(mockSubscription as never, mockPlan as never)
      expect(normalized.provider).toBe('paypal')
      expect(normalized.subscriptionId).toBe('I-BW452GLLEP1G')
      expect(normalized.productId).toBe('PROD-6XF24676R0513620K')
      expect(normalized.status).toBe('active')
      expect(normalized.isActive).toBe(true)
      expect(normalized.willRenew).toBe(true)
      expect(normalized.currentPeriodEnd).toBe(Date.parse('2099-08-01T10:00:00Z'))
      expect(normalized.canceledAt).toBeUndefined()
    })

    it('falls back to the plan id when no plan object is provided', async () => {
      const { normalizeSubscription } = await import('../provider.js')
      const normalized = normalizeSubscription(mockSubscription as never)
      expect(normalized.productId).toBe('P-5ML4271244454362WXNWU5NQ')
    })

    it('marks a cancelled subscription with canceledAt and no renewal', async () => {
      const { normalizeSubscription } = await import('../provider.js')
      const normalized = normalizeSubscription({
        ...mockSubscription,
        status: 'CANCELLED',
        status_update_time: '2026-07-15T10:00:00Z',
      } as never)
      expect(normalized.status).toBe('canceled')
      expect(normalized.isActive).toBe(false)
      expect(normalized.willRenew).toBe(false)
      expect(normalized.canceledAt).toBe(Date.parse('2026-07-15T10:00:00Z'))
    })
  })
})
