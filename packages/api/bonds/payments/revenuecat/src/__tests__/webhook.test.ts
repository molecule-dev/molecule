/**
 * Tests for RevenueCat webhook authentication and parsing.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RevenueCatWebhookEventPayload } from '../types.js'
import {
  authenticateWebhook,
  mapEventStatus,
  mapEventType,
  parseWebhookEvent,
  readHeader,
} from '../webhook.js'

// Mock @molecule/api-config so the sandbox flag and the replay tolerance are
// controllable. Default: return the given default (fail-closed).
const { mockGetConfig } = vi.hoisted(() => ({ mockGetConfig: vi.fn() }))
vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

const SECRET = 'whsec_revenuecat_test_secret'
const NOW = 1_700_000_000_000
const T = Math.floor(NOW / 1000)

/** Signs a body the way RevenueCat does. */
const sign = (body: string, timestampSeconds = T, secret = SECRET): string => {
  const digest = createHmac('sha256', secret)
    .update(Buffer.from(`${timestampSeconds}.${body}`, 'utf8'))
    .digest('hex')
  return `t=${timestampSeconds},v1=${digest}`
}

/** Builds an event payload with sane, active defaults. */
const event = (
  overrides: Partial<RevenueCatWebhookEventPayload> = {},
): RevenueCatWebhookEventPayload => ({
  type: 'RENEWAL',
  app_user_id: 'user-123',
  original_app_user_id: 'user-123',
  aliases: ['user-123'],
  product_id: 'com.example.pro.monthly',
  entitlement_ids: ['pro'],
  environment: 'PRODUCTION',
  period_type: 'NORMAL',
  purchased_at_ms: NOW - 1000,
  expiration_at_ms: NOW + 86400000,
  store: 'APP_STORE',
  id: 'evt_1',
  ...overrides,
})

beforeEach(() => {
  mockGetConfig.mockImplementation((_key: string, defaultValue?: unknown) => defaultValue)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('readHeader', () => {
  it('reads a header case-insensitively', () => {
    expect(
      readHeader({ 'X-RevenueCat-Webhook-Signature': 'v' }, 'x-revenuecat-webhook-signature'),
    ).toBe('v')
    expect(readHeader({ authorization: 'v' }, 'authorization')).toBe('v')
  })

  it('takes the first value of a repeated header', () => {
    expect(readHeader({ authorization: ['a', 'b'] }, 'authorization')).toBe('a')
  })

  it('returns undefined for a missing header or missing headers object', () => {
    expect(readHeader({}, 'authorization')).toBeUndefined()
    expect(readHeader(undefined, 'authorization')).toBeUndefined()
  })
})

describe('authenticateWebhook', () => {
  const body = JSON.stringify({ api_version: '1.0', event: event() })

  it('THROWS a tagged config error when NEITHER mechanism is configured — never accepts', () => {
    // An unauthenticated webhook URL is a plan-grant endpoint anyone can POST
    // to, so this fails closed rather than defaulting to "allow".
    expect(() => authenticateWebhook(body, {}, NOW)).toThrowError(
      expect.objectContaining({ statusCode: 503, errorKey: 'config.notConfigured' }),
    )
  })

  it('accepts a matching Authorization header when only that is configured', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTHORIZATION', 'Bearer shared')
    expect(authenticateWebhook(body, { authorization: 'Bearer shared' }, NOW)).toBe(true)
  })

  it('rejects a wrong or missing Authorization header', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTHORIZATION', 'Bearer shared')
    expect(authenticateWebhook(body, { authorization: 'Bearer wrong' }, NOW)).toBe(false)
    expect(authenticateWebhook(body, {}, NOW)).toBe(false)
  })

  it('accepts a valid HMAC signature when only signing is configured', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    expect(authenticateWebhook(body, { 'X-RevenueCat-Webhook-Signature': sign(body) }, NOW)).toBe(
      true,
    )
  })

  it('rejects a forged signature', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    expect(
      authenticateWebhook(
        body,
        { 'x-revenuecat-webhook-signature': sign(body, T, 'attacker_secret') },
        NOW,
      ),
    ).toBe(false)
  })

  it('rejects a request with NO signature header when signing is configured', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    expect(authenticateWebhook(body, {}, NOW)).toBe(false)
  })

  it('requires BOTH mechanisms to pass when both are configured', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTHORIZATION', 'Bearer shared')
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)

    const signature = sign(body)
    expect(
      authenticateWebhook(
        body,
        { authorization: 'Bearer shared', 'x-revenuecat-webhook-signature': signature },
        NOW,
      ),
    ).toBe(true)
    // Valid signature, wrong shared header.
    expect(
      authenticateWebhook(
        body,
        { authorization: 'Bearer wrong', 'x-revenuecat-webhook-signature': signature },
        NOW,
      ),
    ).toBe(false)
    // Valid shared header, forged signature.
    expect(
      authenticateWebhook(
        body,
        {
          authorization: 'Bearer shared',
          'x-revenuecat-webhook-signature': sign(body, T, 'attacker_secret'),
        },
        NOW,
      ),
    ).toBe(false)
  })

  it('rejects a stale signature outside the default 5-minute window', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    expect(
      authenticateWebhook(body, { 'x-revenuecat-webhook-signature': sign(body, T - 301) }, NOW),
    ).toBe(false)
    expect(mockGetConfig).toHaveBeenCalledWith('REVENUECAT_WEBHOOK_TOLERANCE_SECONDS', '300')
  })

  it('honours REVENUECAT_WEBHOOK_TOLERANCE_SECONDS', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_WEBHOOK_TOLERANCE_SECONDS' ? '900' : defaultValue,
    )
    expect(
      authenticateWebhook(body, { 'x-revenuecat-webhook-signature': sign(body, T - 301) }, NOW),
    ).toBe(true)
  })

  it('falls back to the default tolerance when the configured value is not a number', () => {
    vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET', SECRET)
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_WEBHOOK_TOLERANCE_SECONDS' ? 'soon' : defaultValue,
    )
    expect(
      authenticateWebhook(body, { 'x-revenuecat-webhook-signature': sign(body, T - 299) }, NOW),
    ).toBe(true)
    expect(
      authenticateWebhook(body, { 'x-revenuecat-webhook-signature': sign(body, T - 301) }, NOW),
    ).toBe(false)
  })

  it('reads the env on EVERY call, so a late-resolved secret is honoured', () => {
    expect(() => authenticateWebhook(body, {}, NOW)).toThrow()
    vi.stubEnv('REVENUECAT_WEBHOOK_AUTHORIZATION', 'Bearer shared')
    expect(authenticateWebhook(body, { authorization: 'Bearer shared' }, NOW)).toBe(true)
  })
})

describe('mapEventType', () => {
  it('maps purchase and renewal events to granting types', () => {
    expect(mapEventType(event({ type: 'INITIAL_PURCHASE' }))).toBe('created')
    expect(mapEventType(event({ type: 'NON_RENEWING_PURCHASE' }))).toBe('created')
    expect(mapEventType(event({ type: 'RENEWAL' }))).toBe('renewed')
    expect(mapEventType(event({ type: 'UNCANCELLATION' }))).toBe('renewed')
    expect(mapEventType(event({ type: 'PRODUCT_CHANGE' }))).toBe('renewed')
    expect(mapEventType(event({ type: 'SUBSCRIPTION_EXTENDED' }))).toBe('renewed')
    expect(mapEventType(event({ type: 'REFUND_REVERSED' }))).toBe('renewed')
    expect(mapEventType(event({ type: 'TEMPORARY_ENTITLEMENT_GRANT' }))).toBe('renewed')
  })

  it('maps EXPIRATION to expired — the one event that ends access', () => {
    expect(mapEventType(event({ type: 'EXPIRATION' }))).toBe('expired')
  })

  it('REGRESSION: a CANCELLATION from an UNSUBSCRIBE does NOT map to a revoking type', () => {
    // RevenueCat fires CANCELLATION when a customer turns auto-renew off; they
    // keep access until expiration_at_ms. Mapping it to `canceled` would revoke
    // a plan the customer has already paid for, weeks early.
    expect(mapEventType(event({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }))).toBe(
      'unsubscribed',
    )
    expect(mapEventType(event({ type: 'CANCELLATION', cancel_reason: 'BILLING_ERROR' }))).toBe(
      'unsubscribed',
    )
    expect(mapEventType(event({ type: 'CANCELLATION', cancel_reason: 'PRICE_INCREASE' }))).toBe(
      'unsubscribed',
    )
    expect(
      mapEventType(event({ type: 'CANCELLATION', cancel_reason: 'DEVELOPER_INITIATED' })),
    ).toBe('unsubscribed')
    expect(mapEventType(event({ type: 'CANCELLATION', cancel_reason: undefined }))).toBe(
      'unsubscribed',
    )
  })

  it('maps a REFUND (cancel_reason CUSTOMER_SUPPORT) to a revoking type', () => {
    expect(mapEventType(event({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }))).toBe(
      'refund',
    )
  })

  it('maps pause and billing-issue events to non-revoking types', () => {
    expect(mapEventType(event({ type: 'SUBSCRIPTION_PAUSED' }))).toBe('paused')
    expect(mapEventType(event({ type: 'BILLING_ISSUE' }))).toBe('billing_issue')
  })

  it('falls through to the lower-cased raw type for an unrecognized event', () => {
    expect(mapEventType(event({ type: 'SOME_NEW_EVENT' }))).toBe('some_new_event')
    expect(mapEventType(event({ type: undefined }))).toBe('')
  })
})

describe('mapEventStatus', () => {
  it('classifies a live renewal as active', () => {
    expect(mapEventStatus(event(), NOW)).toBe('active')
  })

  it('classifies a trial period as trialing', () => {
    expect(mapEventStatus(event({ period_type: 'TRIAL' }), NOW)).toBe('trialing')
  })

  it('classifies a PAID intro period as active, not trialing', () => {
    expect(mapEventStatus(event({ period_type: 'INTRO' }), NOW)).toBe('active')
  })

  it('classifies a refund as canceled and an expiration as expired', () => {
    expect(
      mapEventStatus(event({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }), NOW),
    ).toBe('canceled')
    expect(mapEventStatus(event({ type: 'EXPIRATION' }), NOW)).toBe('expired')
  })

  it('classifies a pause as paused and a billing issue as past_due', () => {
    expect(mapEventStatus(event({ type: 'SUBSCRIPTION_PAUSED' }), NOW)).toBe('paused')
    expect(mapEventStatus(event({ type: 'BILLING_ISSUE' }), NOW)).toBe('past_due')
  })

  it('classifies an unsubscribed-but-still-paid customer as active', () => {
    expect(mapEventStatus(event({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }), NOW)).toBe(
      'active',
    )
  })

  it('classifies a past expiration_at_ms as expired', () => {
    expect(mapEventStatus(event({ expiration_at_ms: NOW - 1 }), NOW)).toBe('expired')
  })

  it('treats a NULL expiration on a purchase as a lifetime grant, not an expiry', () => {
    expect(
      mapEventStatus(event({ type: 'NON_RENEWING_PURCHASE', expiration_at_ms: null }), NOW),
    ).toBe('active')
  })
})

describe('parseWebhookEvent', () => {
  it('normalizes a RENEWAL into a granting WebhookEvent', () => {
    expect(parseWebhookEvent({ api_version: '1.0', event: event() }, NOW)).toEqual({
      type: 'renewed',
      subscription: {
        customerId: 'user-123',
        productId: 'com.example.pro.monthly',
        priceId: 'pro',
        expiresAt: new Date(NOW + 86400000).toISOString(),
        autoRenews: true,
        status: 'active',
        isActive: true,
      },
    })
  })

  it('REGRESSION: keys customerId on original_app_user_id, not the last-seen alias', () => {
    // `app_user_id` is only the LAST SEEN id. Keying on it would miss the
    // payment record verifyReceipt wrote under the customer's original id, and
    // the webhook would be silently dropped for every aliased subscriber.
    const parsed = parseWebhookEvent(
      {
        event: event({
          app_user_id: 'alias-2',
          original_app_user_id: 'original-1',
          aliases: ['original-1', 'alias-2'],
        }),
      },
      NOW,
    )
    expect(parsed?.subscription?.customerId).toBe('original-1')
  })

  it('falls back to app_user_id when the event carries no original_app_user_id', () => {
    // TEMPORARY_ENTITLEMENT_GRANT is dispatched under limited connectivity and
    // omits every subscriber-identity field beyond app_user_id.
    const parsed = parseWebhookEvent(
      {
        event: event({
          type: 'TEMPORARY_ENTITLEMENT_GRANT',
          app_user_id: 'user-123',
          original_app_user_id: undefined,
          aliases: undefined,
        }),
      },
      NOW,
    )
    expect(parsed?.subscription?.customerId).toBe('user-123')
  })

  it('carries the ENTITLEMENT id in priceId so either plan registration resolves', () => {
    const parsed = parseWebhookEvent(
      { event: event({ entitlement_ids: ['pro', 'legacy_pro'] }) },
      NOW,
    )
    expect(parsed?.subscription?.productId).toBe('com.example.pro.monthly')
    expect(parsed?.subscription?.priceId).toBe('pro')
  })

  it('leaves priceId undefined when the product maps to no entitlement', () => {
    expect(
      parseWebhookEvent({ event: event({ entitlement_ids: null }) }, NOW)?.subscription?.priceId,
    ).toBeUndefined()
  })

  it('reports autoRenews=false without revoking for an UNSUBSCRIBE cancellation', () => {
    const parsed = parseWebhookEvent(
      { event: event({ type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' }) },
      NOW,
    )
    expect(parsed?.type).toBe('unsubscribed')
    expect(parsed?.subscription).toMatchObject({
      autoRenews: false,
      status: 'active',
      isActive: true,
      expiresAt: new Date(NOW + 86400000).toISOString(),
    })
  })

  it('reports a refund as a revoking event', () => {
    const parsed = parseWebhookEvent(
      { event: event({ type: 'CANCELLATION', cancel_reason: 'CUSTOMER_SUPPORT' }) },
      NOW,
    )
    expect(parsed?.type).toBe('refund')
    expect(parsed?.subscription).toMatchObject({ status: 'canceled', isActive: false })
  })

  it('reports BILLING_ISSUE as not-entitling, so the plan is neither extended nor revoked', () => {
    const parsed = parseWebhookEvent({ event: event({ type: 'BILLING_ISSUE' }) }, NOW)
    expect(parsed?.type).toBe('billing_issue')
    expect(parsed?.subscription).toMatchObject({
      status: 'past_due',
      isActive: false,
      autoRenews: false,
    })
  })

  it('reports SUBSCRIPTION_PAUSED as not-entitling and not revoking', () => {
    const parsed = parseWebhookEvent({ event: event({ type: 'SUBSCRIPTION_PAUSED' }) }, NOW)
    expect(parsed?.type).toBe('paused')
    expect(parsed?.subscription?.isActive).toBe(false)
  })

  it('attaches NO subscription to account-level events (TRANSFER, INVOICE_ISSUANCE, …)', () => {
    for (const type of [
      'TRANSFER',
      'INVOICE_ISSUANCE',
      'SUBSCRIBER_ALIAS',
      'EXPERIMENT_ENROLLMENT',
      'VIRTUAL_CURRENCY_TRANSACTION',
    ]) {
      const parsed = parseWebhookEvent({ event: event({ type }) }, NOW)
      expect(parsed).toEqual({ type: type.toLowerCase() })
    }
  })

  it('returns a bare {type:"test"} for the dashboard TEST event', () => {
    expect(parseWebhookEvent({ event: event({ type: 'TEST' }) }, NOW)).toEqual({ type: 'test' })
  })

  it('leaves expiresAt undefined for a lifetime purchase (null expiration)', () => {
    const parsed = parseWebhookEvent(
      { event: event({ type: 'NON_RENEWING_PURCHASE', expiration_at_ms: null }) },
      NOW,
    )
    expect(parsed?.subscription?.expiresAt).toBeUndefined()
    expect(parsed?.subscription?.autoRenews).toBe(false)
  })

  it('REJECTS a SANDBOX event by default (fail-closed) — a sandbox purchase is free', () => {
    expect(parseWebhookEvent({ event: event({ environment: 'SANDBOX' }) }, NOW)).toBeNull()
    expect(mockGetConfig).toHaveBeenCalledWith('REVENUECAT_ALLOW_SANDBOX', 'false')
  })

  it('accepts a SANDBOX event only when REVENUECAT_ALLOW_SANDBOX=true', () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_ALLOW_SANDBOX' ? 'true' : defaultValue,
    )
    expect(parseWebhookEvent({ event: event({ environment: 'SANDBOX' }) }, NOW)?.type).toBe(
      'renewed',
    )
  })

  it('rejects a body with no event, no type, or no body at all', () => {
    expect(parseWebhookEvent(undefined, NOW)).toBeNull()
    expect(parseWebhookEvent({}, NOW)).toBeNull()
    expect(parseWebhookEvent({ event: {} }, NOW)).toBeNull()
    expect(parseWebhookEvent({ event: event({ type: undefined }) }, NOW)).toBeNull()
  })
})
