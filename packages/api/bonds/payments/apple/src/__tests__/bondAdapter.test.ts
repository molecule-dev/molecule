const { mockVerifyReceipt, mockGetLatestSubscription, mockIsSubscriptionActive } = vi.hoisted(
  () => ({
    mockVerifyReceipt: vi.fn(),
    mockGetLatestSubscription: vi.fn(),
    mockIsSubscriptionActive: vi.fn(),
  }),
)

vi.mock('../provider.js', () => ({
  verifyReceipt: mockVerifyReceipt,
  getLatestSubscription: mockGetLatestSubscription,
  isSubscriptionActive: mockIsSubscriptionActive,
}))

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
    const out = await paymentProvider.verifyReceipt!('receipt', 'com.app.pro')
    expect(out).toEqual({
      productId: 'com.app.pro',
      transactionId: 'txn-1',
      expiresAt: new Date(1700000000000).toISOString(),
      autoRenews: true,
      data: expect.objectContaining({ product_id: 'com.app.pro' }),
    })
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

  it('returns null when notification_type is missing (v2 signedPayload unsupported)', async () => {
    expect(await paymentProvider.parseNotification!({})).toBeNull()
    // A v2 signedPayload body carries no top-level notification_type → rejected.
    expect(await paymentProvider.parseNotification!({ signedPayload: 'eyJ...' })).toBeNull()
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
