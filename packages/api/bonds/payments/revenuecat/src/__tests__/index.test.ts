/**
 * Tests for the RevenueCat REST transport and normalization.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findSubscription,
  getBaseUrl,
  getEffectiveExpiry,
  getLatestSubscription,
  getStoreTransactionId,
  getSubscriber,
  isSubscriptionActive,
  normalizeSubscription,
  normalizeSubscriptionStatus,
  REVENUECAT_API_BASE_URL,
  RevenueCatApiError,
  sandboxPurchasesAllowed,
  willSubscriptionRenew,
} from '../provider.js'
import type { RevenueCatSubscriber, RevenueCatSubscription } from '../types.js'

// Mock @molecule/api-config so the base-URL override and the sandbox-acceptance
// flag are controllable. The default implementation returns the provided
// default value (fail-closed: REVENUECAT_ALLOW_SANDBOX defaults to 'false'),
// mirroring an env with neither set.
const { mockGetConfig } = vi.hoisted(() => ({ mockGetConfig: vi.fn() }))
vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

const mockFetch = vi.fn()

/** Builds a subscription fixture with sane, active defaults. */
const subscription = (overrides: Partial<RevenueCatSubscription> = {}): RevenueCatSubscription => ({
  expires_date: new Date(Date.now() + 86400000).toISOString(),
  purchase_date: '2026-08-01T00:00:00Z',
  original_purchase_date: '2026-01-01T00:00:00Z',
  period_type: 'normal',
  store: 'app_store',
  is_sandbox: false,
  ownership_type: 'PURCHASED',
  store_transaction_id: 'txn_1',
  unsubscribe_detected_at: null,
  billing_issues_detected_at: null,
  refunded_at: null,
  grace_period_expires_date: null,
  auto_resume_date: null,
  ...overrides,
})

/** Builds a JSON `Response`-alike for the mocked fetch. */
const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

beforeEach(() => {
  vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_test_key')
  mockGetConfig.mockImplementation((_key: string, defaultValue?: unknown) => defaultValue)
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('getBaseUrl', () => {
  it('defaults to RevenueCat’s public v1 base URL', () => {
    expect(getBaseUrl()).toBe(REVENUECAT_API_BASE_URL)
    expect(REVENUECAT_API_BASE_URL).toBe('https://api.revenuecat.com/v1')
  })

  it('honours the REVENUECAT_BASE_URL override', () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_BASE_URL' ? 'https://broker.example.com/v1' : defaultValue,
    )
    expect(getBaseUrl()).toBe('https://broker.example.com/v1')
  })

  it('strips a trailing slash from the override so paths do not double up', () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_BASE_URL' ? 'https://broker.example.com/v1/' : defaultValue,
    )
    expect(getBaseUrl()).toBe('https://broker.example.com/v1')
  })
})

describe('sandboxPurchasesAllowed', () => {
  it('is false by default (fail-closed)', () => {
    expect(sandboxPurchasesAllowed()).toBe(false)
    expect(mockGetConfig).toHaveBeenCalledWith('REVENUECAT_ALLOW_SANDBOX', 'false')
  })

  it('is true only for the exact string "true"', () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_ALLOW_SANDBOX' ? 'true' : defaultValue,
    )
    expect(sandboxPurchasesAllowed()).toBe(true)

    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_ALLOW_SANDBOX' ? '1' : defaultValue,
    )
    expect(sandboxPurchasesAllowed()).toBe(false)
  })
})

describe('getSubscriber', () => {
  it('GETs the customer with a Bearer secret key and no request body', async () => {
    const body = { request_date_ms: 1, subscriber: { subscriptions: {} } }
    mockFetch.mockResolvedValue(jsonResponse(200, body))

    const result = await getSubscriber('user-123')

    expect(result).toEqual(body)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('https://api.revenuecat.com/v1/subscribers/user-123', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer sk_test_key',
        Accept: 'application/json',
      },
    })
    // A GET carries no body — asserted explicitly because sending one here is
    // the classic copy-from-a-POST-bond mistake.
    expect(mockFetch.mock.calls[0]?.[1]).not.toHaveProperty('body')
  })

  it('URL-encodes an App User ID containing path-significant characters', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { subscriber: {} }))

    await getSubscriber('$RCAnonymousID:a/b c')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/%24RCAnonymousID%3Aa%2Fb%20c',
      expect.any(Object),
    )
  })

  it('uses the REVENUECAT_BASE_URL override', async () => {
    mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
      key === 'REVENUECAT_BASE_URL' ? 'https://broker.example.com/v1' : defaultValue,
    )
    mockFetch.mockResolvedValue(jsonResponse(200, { subscriber: {} }))

    await getSubscriber('user-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://broker.example.com/v1/subscribers/user-123',
      expect.any(Object),
    )
  })

  it('reads the API key on EVERY call, so a late-resolved secret is honoured', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { subscriber: {} }))

    await getSubscriber('user-123')
    vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_rotated')
    await getSubscriber('user-123')

    expect(mockFetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer sk_rotated' },
    })
  })

  it('throws a tagged config-not-configured error BEFORE any request when the key is unset', async () => {
    vi.unstubAllEnvs()

    await expect(getSubscriber('user-123')).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    // Fails BEFORE any network call — never sends RevenueCat `Bearer undefined`.
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws RevenueCatApiError carrying the vendor status and code on a 4xx', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { code: 7225, message: 'Invalid API Key.' }))

    const error = await getSubscriber('user-123').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RevenueCatApiError)
    expect(error).toMatchObject({
      name: 'RevenueCatApiError',
      message: 'Invalid API Key.',
      status: 401,
      code: '7225',
    })
    // Deliberately NOT tagged: the API middleware must answer its own generic
    // error rather than echo RevenueCat's status to the caller.
    expect(error).not.toHaveProperty('statusCode')
    expect(error).not.toHaveProperty('errorKey')
  })

  it('throws RevenueCatApiError on a 5xx, with a fallback message when the body has none', async () => {
    mockFetch.mockResolvedValue(jsonResponse(503, {}))

    await expect(getSubscriber('user-123')).rejects.toMatchObject({
      name: 'RevenueCatApiError',
      message: 'RevenueCat responded with 503.',
      status: 503,
      code: undefined,
    })
  })

  it('throws RevenueCatApiError when the response body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('Unexpected token < in JSON')
      },
    })

    await expect(getSubscriber('user-123')).rejects.toMatchObject({
      name: 'RevenueCatApiError',
      status: 502,
    })
  })

  it('throws RevenueCatApiError when a 200 carries no subscriber object', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { request_date_ms: 1 }))

    await expect(getSubscriber('user-123')).rejects.toMatchObject({
      name: 'RevenueCatApiError',
      message: 'RevenueCat response contained no subscriber object.',
      status: 200,
    })
  })

  it('rethrows a transport failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    await expect(getSubscriber('user-123')).rejects.toThrow('Network error')
  })

  it('treats a 201 (customer created on read) as success — RevenueCat has no 404 here', async () => {
    const body = { subscriber: { subscriptions: {}, entitlements: {} } }
    mockFetch.mockResolvedValue(jsonResponse(201, body))

    await expect(getSubscriber('never-seen')).resolves.toEqual(body)
  })
})

describe('getEffectiveExpiry', () => {
  it('returns the expiry in milliseconds', () => {
    expect(getEffectiveExpiry(subscription({ expires_date: '2026-09-01T00:00:00Z' }))).toBe(
      Date.parse('2026-09-01T00:00:00Z'),
    )
  })

  it('prefers a LATER grace-period expiry — a customer in grace has not lost access', () => {
    expect(
      getEffectiveExpiry(
        subscription({
          expires_date: '2026-09-01T00:00:00Z',
          grace_period_expires_date: '2026-09-16T00:00:00Z',
        }),
      ),
    ).toBe(Date.parse('2026-09-16T00:00:00Z'))
  })

  it('ignores a grace period that ends before the expiry', () => {
    expect(
      getEffectiveExpiry(
        subscription({
          expires_date: '2026-09-01T00:00:00Z',
          grace_period_expires_date: '2026-08-01T00:00:00Z',
        }),
      ),
    ).toBe(Date.parse('2026-09-01T00:00:00Z'))
  })

  it('falls back to the grace period when there is no expiry', () => {
    expect(
      getEffectiveExpiry(
        subscription({
          expires_date: null,
          grace_period_expires_date: '2026-09-16T00:00:00Z',
        }),
      ),
    ).toBe(Date.parse('2026-09-16T00:00:00Z'))
  })

  it('returns undefined when neither date is present or parseable', () => {
    expect(getEffectiveExpiry(subscription({ expires_date: null }))).toBeUndefined()
    expect(getEffectiveExpiry(subscription({ expires_date: 'not-a-date' }))).toBeUndefined()
  })
})

describe('getStoreTransactionId', () => {
  it('coerces the NUMBER App Store sends to a string', () => {
    expect(getStoreTransactionId(subscription({ store_transaction_id: 1000000652379790 }))).toBe(
      '1000000652379790',
    )
  })

  it('passes a string through', () => {
    expect(
      getStoreTransactionId(subscription({ store_transaction_id: 'GPA.6801-7988-0152' })),
    ).toBe('GPA.6801-7988-0152')
  })

  it('returns undefined for null, undefined, and empty string', () => {
    expect(getStoreTransactionId(subscription({ store_transaction_id: null }))).toBeUndefined()
    expect(getStoreTransactionId(subscription({ store_transaction_id: undefined }))).toBeUndefined()
    expect(getStoreTransactionId(subscription({ store_transaction_id: '' }))).toBeUndefined()
  })
})

describe('findSubscription', () => {
  const subscriber: RevenueCatSubscriber = {
    entitlements: {
      pro: {
        expires_date: '2026-09-01T00:00:00Z',
        grace_period_expires_date: null,
        product_identifier: 'com.example.pro.monthly',
        purchase_date: '2026-08-01T00:00:00Z',
      },
    },
    subscriptions: {
      'com.example.pro.monthly': subscription(),
      'com.example.basic.monthly': subscription({ store_transaction_id: 'txn_basic' }),
    },
  }

  it('resolves an ENTITLEMENT identifier to the product that grants it', () => {
    const match = findSubscription(subscriber, 'pro')
    expect(match).toMatchObject({
      productId: 'com.example.pro.monthly',
      entitlementId: 'pro',
    })
    expect(match?.subscription).toBe(subscriber.subscriptions?.['com.example.pro.monthly'])
  })

  it('resolves a store PRODUCT identifier and surfaces the entitlement that grants it', () => {
    expect(findSubscription(subscriber, 'com.example.pro.monthly')).toMatchObject({
      productId: 'com.example.pro.monthly',
      entitlementId: 'pro',
    })
  })

  it('resolves a product with no entitlement mapping, leaving entitlementId undefined', () => {
    const match = findSubscription(subscriber, 'com.example.basic.monthly')
    expect(match?.productId).toBe('com.example.basic.monthly')
    expect(match?.entitlementId).toBeUndefined()
  })

  it('returns null for an identifier the customer does not own', () => {
    expect(findSubscription(subscriber, 'com.example.enterprise')).toBeNull()
  })

  it('returns null when an entitlement names a ONE-TIME purchase (no subscription)', () => {
    // The `non_subscriptions` case: the entitlement exists but no subscription
    // backs it, and one-time purchases are out of this bond's scope.
    expect(
      findSubscription(
        {
          entitlements: {
            lifetime: {
              expires_date: null,
              grace_period_expires_date: null,
              product_identifier: 'onetime',
              purchase_date: '2026-08-01T00:00:00Z',
            },
          },
          non_subscriptions: {
            onetime: [{ id: 'abc', purchase_date: '2026-08-01T00:00:00Z', store: 'app_store' }],
          },
        },
        'lifetime',
      ),
    ).toBeNull()
  })

  it('returns null for a customer with nothing at all', () => {
    expect(findSubscription({}, 'pro')).toBeNull()
  })
})

describe('getLatestSubscription', () => {
  it('returns the subscription with the latest effective expiry', () => {
    const match = getLatestSubscription({
      subscriptions: {
        onemonth: subscription({ expires_date: '2026-09-01T00:00:00Z' }),
        annual: subscription({ expires_date: '2027-09-01T00:00:00Z' }),
      },
    })
    expect(match?.productId).toBe('annual')
  })

  it('skips subscriptions carrying no expiry at all', () => {
    const match = getLatestSubscription({
      subscriptions: {
        weird: subscription({ expires_date: null, grace_period_expires_date: null }),
        annual: subscription({ expires_date: '2027-09-01T00:00:00Z' }),
      },
    })
    expect(match?.productId).toBe('annual')
  })

  it('counts a grace period toward "latest"', () => {
    const match = getLatestSubscription({
      subscriptions: {
        onemonth: subscription({
          expires_date: '2026-09-01T00:00:00Z',
          grace_period_expires_date: '2028-01-01T00:00:00Z',
        }),
        annual: subscription({ expires_date: '2027-09-01T00:00:00Z' }),
      },
    })
    expect(match?.productId).toBe('onemonth')
  })

  it('surfaces the granting entitlement id on the winner', () => {
    const match = getLatestSubscription({
      entitlements: {
        pro: {
          expires_date: '2027-09-01T00:00:00Z',
          grace_period_expires_date: null,
          product_identifier: 'annual',
          purchase_date: '2026-08-01T00:00:00Z',
        },
      },
      subscriptions: { annual: subscription({ expires_date: '2027-09-01T00:00:00Z' }) },
    })
    expect(match).toMatchObject({ productId: 'annual', entitlementId: 'pro' })
  })

  it('returns null when the customer has no subscriptions', () => {
    expect(getLatestSubscription({})).toBeNull()
    expect(getLatestSubscription({ subscriptions: {} })).toBeNull()
  })
})

describe('isSubscriptionActive', () => {
  it('is true for an unrefunded subscription expiring in the future', () => {
    expect(isSubscriptionActive(subscription())).toBe(true)
  })

  it('is false past the expiry', () => {
    expect(
      isSubscriptionActive(
        subscription({ expires_date: new Date(Date.now() - 86400000).toISOString() }),
      ),
    ).toBe(false)
  })

  it('is true while inside a billing grace period that outlasts the expiry', () => {
    expect(
      isSubscriptionActive(
        subscription({
          expires_date: new Date(Date.now() - 86400000).toISOString(),
          grace_period_expires_date: new Date(Date.now() + 86400000).toISOString(),
        }),
      ),
    ).toBe(true)
  })

  it('REGRESSION: is false for a REFUNDED subscription whose period end is still in the future', () => {
    // RevenueCat keeps serving a refunded purchase with its original future
    // expires_date and only sets refunded_at. Without this gate a refunded
    // customer could re-verify to re-grant the plan until the original period
    // end (refund bypass).
    expect(isSubscriptionActive(subscription({ refunded_at: '2026-08-15T00:00:00Z' }))).toBe(false)
  })

  it('is TRUE for a still-paid customer who merely turned auto-renew off', () => {
    expect(
      isSubscriptionActive(subscription({ unsubscribe_detected_at: '2026-08-15T00:00:00Z' })),
    ).toBe(true)
  })

  it('is false for a subscription with no expiry and for null', () => {
    expect(isSubscriptionActive(subscription({ expires_date: null }))).toBe(false)
    expect(isSubscriptionActive(null)).toBe(false)
  })
})

describe('willSubscriptionRenew', () => {
  it('is true by default', () => {
    expect(willSubscriptionRenew(subscription())).toBe(true)
  })

  it('REGRESSION [doc-drift]: is false once unsubscribe_detected_at is set, even while still active', () => {
    // Turning auto-renew off does NOT end access — the customer keeps it until
    // expiry — so inferring "will renew" from "is active" reports true right up
    // until the subscription silently lapses.
    const sub = subscription({ unsubscribe_detected_at: '2026-08-15T00:00:00Z' })
    expect(isSubscriptionActive(sub)).toBe(true)
    expect(willSubscriptionRenew(sub)).toBe(false)
  })

  it('is false after a refund', () => {
    expect(willSubscriptionRenew(subscription({ refunded_at: '2026-08-15T00:00:00Z' }))).toBe(false)
  })
})

describe('normalizeSubscriptionStatus', () => {
  it('maps a refund to canceled', () => {
    expect(normalizeSubscriptionStatus(subscription({ refunded_at: '2026-08-15T00:00:00Z' }))).toBe(
      'canceled',
    )
  })

  it('maps a past expiry to expired', () => {
    expect(
      normalizeSubscriptionStatus(
        subscription({ expires_date: new Date(Date.now() - 1000).toISOString() }),
      ),
    ).toBe('expired')
  })

  it('maps a pending Google Play pause to paused', () => {
    expect(
      normalizeSubscriptionStatus(subscription({ auto_resume_date: '2026-10-01T00:00:00Z' })),
    ).toBe('paused')
  })

  it('maps an unresolved billing problem to past_due', () => {
    expect(
      normalizeSubscriptionStatus(
        subscription({ billing_issues_detected_at: '2026-08-15T00:00:00Z' }),
      ),
    ).toBe('past_due')
  })

  it('maps a free trial to trialing', () => {
    expect(normalizeSubscriptionStatus(subscription({ period_type: 'trial' }))).toBe('trialing')
  })

  it('maps a PAID intro period to active, not trialing', () => {
    expect(normalizeSubscriptionStatus(subscription({ period_type: 'intro' }))).toBe('active')
  })

  it('maps an ordinary paid period to active', () => {
    expect(normalizeSubscriptionStatus(subscription())).toBe('active')
  })
})

describe('normalizeSubscription', () => {
  it('normalizes an active subscription', () => {
    const expires = new Date(Date.now() + 86400000).toISOString()
    const sub = subscription({ expires_date: expires })

    const normalized = normalizeSubscription('com.example.pro.monthly', sub)

    expect(normalized).toEqual({
      provider: 'revenuecat',
      subscriptionId: 'txn_1',
      productId: 'com.example.pro.monthly',
      status: 'active',
      isActive: true,
      currentPeriodStart: Date.parse('2026-08-01T00:00:00Z'),
      currentPeriodEnd: Date.parse(expires),
      willRenew: true,
      canceledAt: undefined,
      rawData: sub,
    })
  })

  it('normalizes a trialing subscription', () => {
    const normalized = normalizeSubscription('p', subscription({ period_type: 'trial' }))
    expect(normalized.status).toBe('trialing')
    expect(normalized.isActive).toBe(true)
  })

  it('normalizes a refunded subscription and records when it was canceled', () => {
    const normalized = normalizeSubscription(
      'p',
      subscription({ refunded_at: '2026-08-15T00:00:00Z' }),
    )
    expect(normalized.status).toBe('canceled')
    expect(normalized.isActive).toBe(false)
    expect(normalized.willRenew).toBe(false)
    expect(normalized.canceledAt).toBe(Date.parse('2026-08-15T00:00:00Z'))
  })

  it('normalizes an expired subscription', () => {
    const normalized = normalizeSubscription(
      'p',
      subscription({ expires_date: new Date(Date.now() - 86400000).toISOString() }),
    )
    expect(normalized.status).toBe('expired')
    expect(normalized.isActive).toBe(false)
  })

  it('derives isActive from the STATUS, so an unresolved billing problem does not entitle', () => {
    // The raw expiry is still in the future, but past_due must not grant —
    // the same rule the payments core's isActiveStatus applies.
    const normalized = normalizeSubscription(
      'p',
      subscription({ billing_issues_detected_at: '2026-08-15T00:00:00Z' }),
    )
    expect(normalized.status).toBe('past_due')
    expect(normalized.isActive).toBe(false)
  })

  it('records the unsubscribe time as canceledAt when there was no refund', () => {
    const normalized = normalizeSubscription(
      'p',
      subscription({ unsubscribe_detected_at: '2026-08-15T00:00:00Z' }),
    )
    expect(normalized.status).toBe('active')
    expect(normalized.willRenew).toBe(false)
    expect(normalized.canceledAt).toBe(Date.parse('2026-08-15T00:00:00Z'))
  })

  it('falls back to the product id when the store reported no transaction id', () => {
    const normalized = normalizeSubscription(
      'com.example.pro.monthly',
      subscription({ store_transaction_id: null }),
    )
    expect(normalized.subscriptionId).toBe('com.example.pro.monthly')
  })

  it('keeps the raw provider payload', () => {
    const sub = subscription()
    expect(normalizeSubscription('p', sub).rawData).toBe(sub)
  })
})

describe('secret definitions', () => {
  it('registers secret definitions in @molecule/api-secrets on import', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../index.js')
    expect(getSecretDefinition('REVENUECAT_SECRET_API_KEY')).toBeDefined()
    expect(getSecretDefinition('REVENUECAT_WEBHOOK_AUTHORIZATION')).toBeDefined()
    expect(getSecretDefinition('REVENUECAT_WEBHOOK_SIGNING_SECRET')).toBeDefined()
  })

  it('registers them from provider.js too, when the barrel is bypassed', async () => {
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    await import('../provider.js')
    expect(getSecretDefinition('REVENUECAT_SECRET_API_KEY')?.required).toBe(true)
  })
})
