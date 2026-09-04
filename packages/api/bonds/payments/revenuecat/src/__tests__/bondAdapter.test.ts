/**
 * Tests for the RevenueCat bond adapter.
 *
 * @module
 */

import type * as ProviderModule from '../provider.js'

const { mockGetSubscriber, mockAuthenticateWebhook, mockParseWebhookEvent, mockGetConfig } =
  vi.hoisted(() => ({
    mockGetSubscriber: vi.fn(),
    mockAuthenticateWebhook: vi.fn(),
    mockParseWebhookEvent: vi.fn(),
    mockGetConfig: vi.fn(),
  }))

// Only the network call is mocked — every pure helper (findSubscription,
// isSubscriptionActive, willSubscriptionRenew, getEffectiveExpiry,
// getStoreTransactionId, assertPurchaseEnvironmentAllowed) stays REAL, so these
// tests exercise the real resolution/entitlement rules against a real
// customer-info shape rather than a mock of them.
vi.mock('../provider.js', async (importOriginal) => {
  const actual = await importOriginal<typeof ProviderModule>()
  return { ...actual, getSubscriber: mockGetSubscriber }
})

// The signature crypto is covered with real HMAC in signature.test.ts and the
// authentication/parsing orchestration in webhook.test.ts — here we only assert
// that handleWebhookEvent DISPATCHES to them correctly.
vi.mock('../webhook.js', () => ({
  authenticateWebhook: mockAuthenticateWebhook,
  parseWebhookEvent: mockParseWebhookEvent,
}))

vi.mock('@molecule/api-config', () => ({ get: mockGetConfig }))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { paymentProvider } from '../bondAdapter.js'
import type { RevenueCatSubscriber, RevenueCatSubscription } from '../types.js'

const FUTURE = new Date(Date.now() + 86400000).toISOString()
const PAST = new Date(Date.now() - 86400000).toISOString()

/** Builds a subscription fixture with sane, active defaults. */
const subscription = (overrides: Partial<RevenueCatSubscription> = {}): RevenueCatSubscription => ({
  expires_date: FUTURE,
  purchase_date: '2026-08-01T00:00:00Z',
  period_type: 'normal',
  store: 'app_store',
  is_sandbox: false,
  store_transaction_id: 'txn_1',
  unsubscribe_detected_at: null,
  refunded_at: null,
  ...overrides,
})

/** Builds a customer with one `pro` entitlement backed by one subscription. */
const subscriber = (
  overrides: Partial<RevenueCatSubscription> = {},
  subscriberOverrides: Partial<RevenueCatSubscriber> = {},
): RevenueCatSubscriber => ({
  original_app_user_id: 'user-123',
  entitlements: {
    pro: {
      expires_date: FUTURE,
      grace_period_expires_date: null,
      product_identifier: 'com.example.pro.monthly',
      purchase_date: '2026-08-01T00:00:00Z',
    },
  },
  subscriptions: { 'com.example.pro.monthly': subscription(overrides) },
  ...subscriberOverrides,
})

beforeEach(() => {
  vi.resetAllMocks()
  mockGetConfig.mockImplementation((_key: string, defaultValue?: unknown) => defaultValue)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('paymentProvider — descriptor', () => {
  it('declares providerName=revenuecat', () => {
    expect(paymentProvider.providerName).toBe('revenuecat')
  })

  it('declares a receipt-style verify flow and a webhook notification flow', () => {
    // RevenueCat authenticates its notifications with request HEADERS (a shared
    // Authorization value and/or an HMAC signature), which only the 'webhook'
    // flow hands to the bond — 'server-notification' passes the parsed body
    // alone and could never verify them.
    expect(paymentProvider.verifyFlow).toBe('receipt')
    expect(paymentProvider.notificationFlow).toBe('webhook')
  })

  it('implements exactly the methods RevenueCat supports', () => {
    expect(typeof paymentProvider.verifyReceipt).toBe('function')
    expect(typeof paymentProvider.handleWebhookEvent).toBe('function')
    // Purchases happen in the store/SDK, so there is no server-side checkout,
    // portal, plan change, or cancellation to implement.
    expect(paymentProvider.verifySubscription).toBeUndefined()
    expect(paymentProvider.updateSubscription).toBeUndefined()
    expect(paymentProvider.cancelSubscription).toBeUndefined()
    expect(paymentProvider.createPortalSession).toBeUndefined()
    expect(paymentProvider.createSetupIntent).toBeUndefined()
  })
})

describe('paymentProvider.verifyReceipt', () => {
  it('returns a VerifiedSubscription resolved by ENTITLEMENT identifier', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber() })

    const out = await paymentProvider.verifyReceipt!('user-123', 'pro')

    expect(mockGetSubscriber).toHaveBeenCalledWith('user-123')
    expect(out).toEqual({
      productId: 'com.example.pro.monthly',
      priceId: 'pro',
      transactionId: 'txn_1',
      expiresAt: new Date(Date.parse(FUTURE)).toISOString(),
      autoRenews: true,
      data: {
        customerId: 'user-123',
        appUserId: 'user-123',
        entitlementId: 'pro',
        subscription: expect.objectContaining({ store_transaction_id: 'txn_1' }),
      },
    })
  })

  it('resolves by STORE PRODUCT identifier too', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber() })

    const out = await paymentProvider.verifyReceipt!('user-123', 'com.example.pro.monthly')

    expect(out?.productId).toBe('com.example.pro.monthly')
    expect(out?.priceId).toBe('pro')
  })

  it('persists data.customerId — the key the webhook path looks the user up by', async () => {
    // Without it, PaymentRecordService.findByCustomerData finds nothing and
    // every RevenueCat webhook is silently dropped.
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber() })

    const out = await paymentProvider.verifyReceipt!('user-123', 'pro')

    expect((out?.data as { customerId?: string }).customerId).toBe('user-123')
  })

  it('prefers the ORIGINAL app user id as customerId, since webhooks report aliases', async () => {
    mockGetSubscriber.mockResolvedValue({
      subscriber: subscriber({}, { original_app_user_id: 'original-1' }),
    })

    const out = await paymentProvider.verifyReceipt!('alias-2', 'pro')

    expect(out?.data).toMatchObject({ customerId: 'original-1', appUserId: 'alias-2' })
  })

  it('falls back to the submitted id when the customer has no original_app_user_id', async () => {
    mockGetSubscriber.mockResolvedValue({
      subscriber: subscriber({}, { original_app_user_id: undefined }),
    })

    const out = await paymentProvider.verifyReceipt!('user-123', 'pro')

    expect((out?.data as { customerId?: string }).customerId).toBe('user-123')
  })

  it('returns null when the customer owns no such product (fraud protection)', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber() })

    expect(await paymentProvider.verifyReceipt!('user-123', 'enterprise')).toBeNull()
  })

  it('returns null for a customer with no purchases at all', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: {} })

    expect(await paymentProvider.verifyReceipt!('never-seen', 'pro')).toBeNull()
  })

  it('returns null for a REFUNDED subscription whose period end is still in the future', async () => {
    // Refund bypass: RevenueCat keeps returning the purchase with its original
    // future expires_date and only sets refunded_at.
    mockGetSubscriber.mockResolvedValue({
      subscriber: subscriber({ refunded_at: '2026-08-15T00:00:00Z' }),
    })

    expect(await paymentProvider.verifyReceipt!('user-123', 'pro')).toBeNull()
  })

  it('returns null for an EXPIRED subscription', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber({ expires_date: PAST }) })

    expect(await paymentProvider.verifyReceipt!('user-123', 'pro')).toBeNull()
  })

  it('reports autoRenews=false for a still-paid customer who unsubscribed', async () => {
    mockGetSubscriber.mockResolvedValue({
      subscriber: subscriber({ unsubscribe_detected_at: '2026-08-15T00:00:00Z' }),
    })

    const out = await paymentProvider.verifyReceipt!('user-123', 'pro')

    expect(out).not.toBeNull()
    expect(out?.autoRenews).toBe(false)
    expect(out?.expiresAt).toBe(new Date(Date.parse(FUTURE)).toISOString())
  })

  it('coerces the NUMBER store_transaction_id App Store sends into a string', async () => {
    mockGetSubscriber.mockResolvedValue({
      subscriber: subscriber({ store_transaction_id: 1000000652379790 }),
    })

    expect((await paymentProvider.verifyReceipt!('user-123', 'pro'))?.transactionId).toBe(
      '1000000652379790',
    )
  })

  it('REJECTS a sandbox purchase by default (fail-closed)', async () => {
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber({ is_sandbox: true }) })

    expect(await paymentProvider.verifyReceipt!('user-123', 'pro')).toBeNull()
    expect(mockGetConfig).toHaveBeenCalledWith('REVENUECAT_ALLOW_SANDBOX', 'false')
  })

  it('accepts a sandbox purchase only when REVENUECAT_ALLOW_SANDBOX=true', async () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_ALLOW_SANDBOX' ? 'true' : defaultValue,
    )
    mockGetSubscriber.mockResolvedValue({ subscriber: subscriber({ is_sandbox: true }) })

    expect(await paymentProvider.verifyReceipt!('user-123', 'pro')).not.toBeNull()
  })

  it('RETHROWS a config-not-configured error instead of swallowing it to null [ambiguous-failure]', async () => {
    // A missing REVENUECAT_SECRET_API_KEY is a DIFFERENT failure than "not
    // entitled" — it must propagate so the resource handler can surface the
    // actionable 503 instead of a generic 400 that reads identically to a
    // customer who simply never bought anything.
    mockGetSubscriber.mockRejectedValue(
      Object.assign(new Error('REVENUECAT_SECRET_API_KEY is not set — payments is disabled.'), {
        statusCode: 503,
        errorKey: 'config.notConfigured',
      }),
    )

    await expect(paymentProvider.verifyReceipt!('user-123', 'pro')).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
  })

  it('returns null + logs on a vendor/transport error', async () => {
    mockGetSubscriber.mockRejectedValue(new Error('network down'))

    expect(await paymentProvider.verifyReceipt!('user-123', 'pro')).toBeNull()
  })
})

describe('paymentProvider.handleWebhookEvent', () => {
  const body = { api_version: '1.0', event: { type: 'RENEWAL', app_user_id: 'user-123' } }
  const raw = JSON.stringify(body)

  it('authenticates with the RAW body bytes and returns the parsed event', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)
    mockParseWebhookEvent.mockReturnValue({ type: 'renewed' })

    const headers = { 'x-revenuecat-webhook-signature': 't=1,v1=abc' }
    const out = await paymentProvider.handleWebhookEvent!({ body, rawBody: raw, headers })

    expect(mockAuthenticateWebhook).toHaveBeenCalledWith(raw, headers)
    expect(mockParseWebhookEvent).toHaveBeenCalledWith(body)
    expect(out).toEqual({ type: 'renewed' })
  })

  it('prefers rawBody over the parsed body — re-serializing changes the signed bytes', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)
    mockParseWebhookEvent.mockReturnValue({ type: 'renewed' })

    // Deliberately spaced JSON: JSON.stringify(body) would NOT reproduce it.
    const spaced = '{"api_version": "1.0", "event": {"type": "RENEWAL"}}'
    await paymentProvider.handleWebhookEvent!({ body, rawBody: spaced, headers: {} })

    expect(mockAuthenticateWebhook).toHaveBeenCalledWith(spaced, {})
  })

  it('accepts a Buffer rawBody and parses it for the event', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)
    mockParseWebhookEvent.mockReturnValue({ type: 'renewed' })

    const buffer = Buffer.from(raw, 'utf8')
    await paymentProvider.handleWebhookEvent!({ rawBody: buffer, headers: {} })

    expect(mockAuthenticateWebhook).toHaveBeenCalledWith(buffer, {})
    expect(mockParseWebhookEvent).toHaveBeenCalledWith(body)
  })

  it('falls back to re-serializing a parsed-only body (works only without a signing secret)', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)
    mockParseWebhookEvent.mockReturnValue({ type: 'renewed' })

    await paymentProvider.handleWebhookEvent!({ body, headers: {} })

    expect(mockAuthenticateWebhook).toHaveBeenCalledWith(JSON.stringify(body), {})
    expect(mockParseWebhookEvent).toHaveBeenCalledWith(body)
  })

  it('returns null WITHOUT parsing when authentication fails', async () => {
    mockAuthenticateWebhook.mockReturnValue(false)

    expect(
      await paymentProvider.handleWebhookEvent!({ body, rawBody: raw, headers: {} }),
    ).toBeNull()
    expect(mockParseWebhookEvent).not.toHaveBeenCalled()
  })

  it('returns null WITHOUT parsing when no webhook authentication is configured', async () => {
    // authenticateWebhook throws a tagged config error rather than accepting an
    // unauthenticated plan grant; the adapter degrades to null (and logs) so the
    // notification route answers 200 without granting anything.
    mockAuthenticateWebhook.mockImplementation(() => {
      throw Object.assign(new Error('not configured'), {
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
    })

    expect(
      await paymentProvider.handleWebhookEvent!({ body, rawBody: raw, headers: {} }),
    ).toBeNull()
    expect(mockParseWebhookEvent).not.toHaveBeenCalled()
  })

  it('returns null when the request carries no body at all', async () => {
    expect(await paymentProvider.handleWebhookEvent!({ headers: {} })).toBeNull()
    expect(mockAuthenticateWebhook).not.toHaveBeenCalled()
  })

  it('returns null on malformed JSON in the raw body', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)

    expect(
      await paymentProvider.handleWebhookEvent!({ rawBody: '{not json', headers: {} }),
    ).toBeNull()
  })

  it('returns null when the parser rejects the event', async () => {
    mockAuthenticateWebhook.mockReturnValue(true)
    mockParseWebhookEvent.mockReturnValue(null)

    expect(
      await paymentProvider.handleWebhookEvent!({ body, rawBody: raw, headers: {} }),
    ).toBeNull()
  })
})
