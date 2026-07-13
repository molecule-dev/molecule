import type * as ProviderModule from '../provider.js'

const {
  mockVerifyReceipt,
  mockGetLatestSubscription,
  mockIsSubscriptionActive,
  mockParseV2Notification,
} = vi.hoisted(() => ({
  mockVerifyReceipt: vi.fn(),
  mockGetLatestSubscription: vi.fn(),
  mockIsSubscriptionActive: vi.fn(),
  mockParseV2Notification: vi.fn(),
}))

// getAutoRenewStatus is kept REAL (via importOriginal) — it's a pure function
// operating on the mockVerifyReceipt-supplied response, and bondAdapter.ts now
// imports it from provider.js (moved there so normalizeSubscription can reuse
// it) instead of defining its own local copy.
vi.mock('../provider.js', async (importOriginal) => {
  const actual = await importOriginal<typeof ProviderModule>()
  return {
    ...actual,
    verifyReceipt: mockVerifyReceipt,
    getLatestSubscription: mockGetLatestSubscription,
    isSubscriptionActive: mockIsSubscriptionActive,
  }
})

// The v2 (JWS/x5c) parsing itself is covered with real crypto in jws.test.ts
// and with mocked-JWS orchestration in notificationV2.test.ts — here we only
// need to assert bondAdapter.parseNotification DISPATCHES to it correctly.
vi.mock('../notificationV2.js', () => ({ parseV2Notification: mockParseV2Notification }))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { paymentProvider } from '../bondAdapter.js'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('paymentProvider — descriptor', () => {
  it('declares providerName=apple', () => {
    expect(paymentProvider.providerName).toBe('apple')
  })

  it('declares receipt-based verifyFlow and S2S notifications', () => {
    expect(paymentProvider.verifyFlow).toBe('receipt')
    expect(paymentProvider.notificationFlow).toBe('server-notification')
  })
})

describe('paymentProvider.verifyReceipt', () => {
  it('returns null when Apple status != 0 (verification failed)', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 21002 })
    const out = await paymentProvider.verifyReceipt!('receipt-data', 'com.app.pro')
    expect(out).toBeNull()
  })

  it('RETHROWS a config-not-configured error instead of swallowing it to null [ambiguous-failure]', async () => {
    // A missing APPLE_SHARED_SECRET is a DIFFERENT failure than "invalid
    // receipt" — it must propagate so the resource handler can surface the
    // actionable 503 instead of a generic 400 that reads identically to a
    // genuinely bad/forged receipt.
    const configError = Object.assign(
      new Error('APPLE_SHARED_SECRET is not set — payments is disabled.'),
      { statusCode: 503, errorKey: 'config.notConfigured' },
    )
    mockVerifyReceipt.mockRejectedValue(configError)

    await expect(
      paymentProvider.verifyReceipt!('receipt-data', 'com.app.pro'),
    ).rejects.toMatchObject({ statusCode: 503, errorKey: 'config.notConfigured' })
  })

  it('returns null when getLatestSubscription returns no subscription', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 })
    mockGetLatestSubscription.mockReturnValue(null)
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toBeNull()
  })

  it('returns null when product_id does NOT match expected (fraud protection)', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 })
    mockGetLatestSubscription.mockReturnValue({
      product_id: 'com.app.basic',
      original_transaction_id: 'txn-1',
      expires_date_ms: '1700000000000',
    })
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toBeNull()
  })

  it('returns VerifiedSubscription when product matches', async () => {
    mockVerifyReceipt.mockResolvedValue({
      status: 0,
      pending_renewal_info: [{ original_transaction_id: 'txn-1', auto_renew_status: '1' }],
    })
    mockGetLatestSubscription.mockReturnValue({
      product_id: 'com.app.pro',
      original_transaction_id: 'txn-1',
      expires_date_ms: '1700000000000',
    })
    mockIsSubscriptionActive.mockReturnValue(true) // [M3-1] active sub passes the reject gate
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toEqual({
      productId: 'com.app.pro',
      transactionId: 'txn-1',
      expiresAt: new Date(1700000000000).toISOString(),
      autoRenews: true,
      data: expect.objectContaining({ product_id: 'com.app.pro' }),
    })
  })

  it('returns null for a REFUNDED/revoked subscription (not active) [M3-1]', async () => {
    mockVerifyReceipt.mockResolvedValue({
      status: 0,
      pending_renewal_info: [{ original_transaction_id: 'txn-1', auto_renew_status: '1' }],
    })
    mockGetLatestSubscription.mockReturnValue({
      product_id: 'com.app.pro',
      original_transaction_id: 'txn-1',
      expires_date_ms: '4070908800000', // future period end…
      cancellation_date: '2024-01-01', // …but Apple refunded it
    })
    mockIsSubscriptionActive.mockReturnValue(false) // refund → not active
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toBeNull()
  })

  it('autoRenews falls back to isSubscriptionActive when no pending_renewal_info match', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 }) // no pending_renewal_info
    mockGetLatestSubscription.mockReturnValue({
      product_id: 'com.app.pro',
      original_transaction_id: 'txn-1',
      expires_date_ms: '1700000000000',
    })
    mockIsSubscriptionActive.mockReturnValue(true)
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out?.autoRenews).toBe(true)
  })

  it('autoRenews=false when pending_renewal_info says auto_renew_status="0"', async () => {
    mockVerifyReceipt.mockResolvedValue({
      status: 0,
      pending_renewal_info: [{ original_transaction_id: 'txn-1', auto_renew_status: '0' }],
    })
    mockGetLatestSubscription.mockReturnValue({
      product_id: 'com.app.pro',
      original_transaction_id: 'txn-1',
      expires_date_ms: '1700000000000',
    })
    mockIsSubscriptionActive.mockReturnValue(true) // [M3-1] active sub passes the reject gate
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out?.autoRenews).toBe(false)
  })

  it('returns null + logs on thrown error (network/parse failure)', async () => {
    mockVerifyReceipt.mockRejectedValue(new Error('network down'))
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toBeNull()
  })
})

describe('paymentProvider.parseNotification', () => {
  it('returns null for non-object body', async () => {
    expect(await paymentProvider.parseNotification!(null)).toBeNull()
    expect(await paymentProvider.parseNotification!('string')).toBeNull()
    expect(await paymentProvider.parseNotification!(42)).toBeNull()
  })

  it('returns null when NEITHER notification_type (v1) nor signedPayload (v2) is present', async () => {
    expect(await paymentProvider.parseNotification!({})).toBeNull()
    expect(mockParseV2Notification).not.toHaveBeenCalled()
  })

  it('REGRESSION [api-drift]: dispatches a v2 body (no notification_type, has signedPayload) to parseV2Notification instead of rejecting it', async () => {
    mockParseV2Notification.mockReturnValue({
      transactionId: 'orig-1',
      productId: 'com.app.pro',
      type: 'renewed',
    })

    const result = await paymentProvider.parseNotification!({ signedPayload: 'eyJhbGciOi...' })

    expect(mockParseV2Notification).toHaveBeenCalledWith('eyJhbGciOi...')
    expect(result).toEqual({ transactionId: 'orig-1', productId: 'com.app.pro', type: 'renewed' })
  })

  it('returns null (not a crash) when parseV2Notification rejects the signedPayload as unauthenticated', async () => {
    mockParseV2Notification.mockReturnValue(null)

    const result = await paymentProvider.parseNotification!({ signedPayload: 'forged' })

    expect(result).toBeNull()
  })

  it('returns null when there is no embedded receipt to verify', async () => {
    // notification_type present but no latest_receipt → cannot authenticate.
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        latest_receipt_info: [{ original_transaction_id: 'txn-1', product_id: 'com.app.pro' }],
      },
    })
    expect(out).toBeNull()
    expect(mockVerifyReceipt).not.toHaveBeenCalled()
  })

  it('REGRESSION: returns null for a forged notification whose receipt fails Apple verification', async () => {
    // The attacker supplies a fabricated body + a bogus latest_receipt. Apple
    // rejects the receipt (status != 0) so NO entitlement is derived.
    mockVerifyReceipt.mockResolvedValue({ status: 21002 })
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        latest_receipt: 'FORGED_BASE64',
        latest_receipt_info: [
          {
            original_transaction_id: 'attacker-known-id',
            product_id: 'com.app.premium',
            expires_date_ms: '4070908800000',
          },
        ],
      },
    })
    expect(mockVerifyReceipt).toHaveBeenCalledWith('FORGED_BASE64')
    expect(out).toBeNull()
  })

  it('derives every field from the VERIFIED receipt, never from the notification body', async () => {
    // Body claims a premium product; the verified receipt says basic. The
    // verified value must win.
    mockVerifyReceipt.mockResolvedValue({
      status: 0,
      pending_renewal_info: [{ original_transaction_id: 'real-txn', auto_renew_status: '1' }],
    })
    mockGetLatestSubscription.mockReturnValue({
      original_transaction_id: 'real-txn',
      product_id: 'com.app.basic',
      expires_date_ms: '1700000000000',
    })

    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        latest_receipt: 'REAL_BASE64',
        latest_receipt_info: [
          {
            original_transaction_id: 'spoofed-id',
            product_id: 'com.app.premium',
            expires_date_ms: '4070908800000',
          },
        ],
      },
    })

    expect(mockVerifyReceipt).toHaveBeenCalledWith('REAL_BASE64')
    expect(out).toEqual({
      transactionId: 'real-txn',
      productId: 'com.app.basic',
      type: 'renewed',
      expiresAt: new Date(1700000000000).toISOString(),
      autoRenews: true,
    })
  })

  it('reads the base64 receipt from the body root (latest_receipt) when no unified_receipt', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 })
    mockGetLatestSubscription.mockReturnValue({
      original_transaction_id: 'txn-init',
      product_id: 'com.app.pro',
      expires_date_ms: '1700000000000',
    })
    mockIsSubscriptionActive.mockReturnValue(true)

    const out = await paymentProvider.parseNotification!({
      notification_type: 'INITIAL_BUY',
      latest_receipt: 'ROOT_BASE64',
    })

    expect(mockVerifyReceipt).toHaveBeenCalledWith('ROOT_BASE64')
    expect(out?.type).toBe('renewed')
    expect(out?.transactionId).toBe('txn-init')
    expect(out?.productId).toBe('com.app.pro')
  })

  it('returns null when the verified receipt has no subscription', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 })
    mockGetLatestSubscription.mockReturnValue(null)
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: { latest_receipt: 'B64' },
    })
    expect(out).toBeNull()
  })

  it('maps the notification_type on an authenticated notification (CANCEL → canceled)', async () => {
    mockVerifyReceipt.mockResolvedValue({ status: 0 })
    mockGetLatestSubscription.mockReturnValue({
      original_transaction_id: 'txn-1',
      product_id: 'com.app.pro',
      expires_date_ms: '1700000000000',
    })
    mockIsSubscriptionActive.mockReturnValue(false)
    const out = await paymentProvider.parseNotification!({
      notification_type: 'CANCEL',
      unified_receipt: { latest_receipt: 'B64' },
    })
    expect(out?.type).toBe('canceled')
  })

  it('returns null + logs on thrown error (network/parse failure during verify)', async () => {
    mockVerifyReceipt.mockRejectedValue(new Error('network down'))
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: { latest_receipt: 'B64' },
    })
    expect(out).toBeNull()
  })
})
