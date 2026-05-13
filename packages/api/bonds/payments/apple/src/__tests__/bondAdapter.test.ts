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

  it('returns null when notification_type is missing', async () => {
    expect(await paymentProvider.parseNotification!({})).toBeNull()
  })

  it('maps DID_RENEW → renewed', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        latest_receipt_info: [
          {
            original_transaction_id: 'txn-1',
            product_id: 'com.app.pro',
            expires_date_ms: '1700000000000',
          },
        ],
      },
    })
    expect(out?.type).toBe('renewed')
  })

  it('maps CANCEL → canceled', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'CANCEL',
    })
    expect(out?.type).toBe('canceled')
  })

  it('maps REFUND / CONSUMPTION_REQUEST → refund', async () => {
    const out1 = await paymentProvider.parseNotification!({ notification_type: 'REFUND' })
    const out2 = await paymentProvider.parseNotification!({
      notification_type: 'CONSUMPTION_REQUEST',
    })
    expect(out1?.type).toBe('refund')
    expect(out2?.type).toBe('refund')
  })

  it('maps DID_FAIL_TO_RENEW → expired', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_FAIL_TO_RENEW',
    })
    expect(out?.type).toBe('expired')
  })

  it('lowercases unknown notification_type as a safe default', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'BRAND_NEW_EVENT',
    })
    expect(out?.type).toBe('brand_new_event')
  })

  it('picks the latest (highest expires_date_ms) transaction', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        latest_receipt_info: [
          {
            original_transaction_id: 'txn-old',
            product_id: 'com.app.pro',
            expires_date_ms: '1600000000000',
          },
          {
            original_transaction_id: 'txn-new',
            product_id: 'com.app.pro',
            expires_date_ms: '1700000000000',
          },
        ],
      },
    })
    expect(out?.transactionId).toBe('txn-new')
  })

  it('falls back to latest_receipt_info on the body when no unified_receipt (v1)', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'INITIAL_BUY',
      latest_receipt_info: [
        {
          original_transaction_id: 'txn-init',
          product_id: 'com.app.pro',
          expires_date_ms: '1700000000000',
        },
      ],
    })
    expect(out?.transactionId).toBe('txn-init')
    expect(out?.productId).toBe('com.app.pro')
  })

  it('autoRenews=true when pending_renewal_info[0].auto_renew_status="1"', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        pending_renewal_info: [{ auto_renew_status: '1' }],
      },
    })
    expect(out?.autoRenews).toBe(true)
  })

  it('autoRenews=false when pending_renewal_info[0].auto_renew_status="0"', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      unified_receipt: {
        pending_renewal_info: [{ auto_renew_status: '0' }],
      },
    })
    expect(out?.autoRenews).toBe(false)
  })

  it('falls back to pending_renewal_info on body root (v1 shape)', async () => {
    const out = await paymentProvider.parseNotification!({
      notification_type: 'DID_RENEW',
      pending_renewal_info: [{ auto_renew_status: '1', auto_renew_product_id: 'com.app.pro' }],
    })
    expect(out?.autoRenews).toBe(true)
    expect(out?.productId).toBe('com.app.pro')
  })
})
