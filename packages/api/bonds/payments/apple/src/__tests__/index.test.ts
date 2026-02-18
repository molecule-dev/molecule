/**
 * Tests for the Apple In-App Purchase provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InAppPurchase, VerifyReceiptResponse } from '../types.js'

// Mock @molecule/api-http
vi.mock('@molecule/api-http', () => ({
  post: vi.fn(),
}))

describe('Apple Provider', () => {
  beforeEach(() => {
    vi.stubEnv('APPLE_SHARED_SECRET', 'test_shared_secret')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('verifyReceipt', () => {
    it('should verify a valid production receipt', async () => {
      const { post } = await import('@molecule/api-http')
      const mockResponse: VerifyReceiptResponse = {
        status: 0,
        environment: 'Production',
        receipt: {
          bundle_id: 'com.example.app',
          application_version: '1.0.0',
          in_app: [],
        },
        latest_receipt_info: [
          {
            quantity: '1',
            product_id: 'com.example.premium',
            transaction_id: 'txn_123',
            original_transaction_id: 'orig_txn_123',
            purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            purchase_date_ms: '1699920000000',
            purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            original_purchase_date_ms: '1699920000000',
            original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            expires_date: '2023-12-14 00:00:00 Etc/GMT',
            expires_date_ms: String(Date.now() + 86400000),
            expires_date_pst: '2023-12-13 16:00:00 America/Los_Angeles',
          },
        ],
      }

      vi.mocked(post).mockResolvedValue({ data: mockResponse })

      const { verifyReceipt } = await import('../provider.js')
      const result = await verifyReceipt('base64_receipt_data')

      expect(result).toEqual(mockResponse)
      expect(post).toHaveBeenCalledWith('https://buy.itunes.apple.com/verifyReceipt', {
        'receipt-data': 'base64_receipt_data',
        password: 'test_shared_secret',
        'exclude-old-transactions': true,
      })
    })

    it('should retry with sandbox when production returns 21007', async () => {
      const { post } = await import('@molecule/api-http')

      const sandboxResponse: VerifyReceiptResponse = {
        status: 0,
        environment: 'Sandbox',
        receipt: {
          bundle_id: 'com.example.app',
          application_version: '1.0.0',
        },
      }

      vi.mocked(post)
        .mockResolvedValueOnce({ data: { status: 21007 } })
        .mockResolvedValueOnce({ data: sandboxResponse })

      const { verifyReceipt } = await import('../provider.js')
      const result = await verifyReceipt('base64_receipt_data')

      expect(result).toEqual(sandboxResponse)
      expect(post).toHaveBeenCalledTimes(2)
      expect(post).toHaveBeenLastCalledWith(
        'https://sandbox.itunes.apple.com/verifyReceipt',
        expect.any(Object),
      )
    })

    it('should use sandbox endpoint directly when useSandbox is true', async () => {
      const { post } = await import('@molecule/api-http')
      const mockResponse: VerifyReceiptResponse = {
        status: 0,
        environment: 'Sandbox',
      }

      vi.mocked(post).mockResolvedValue({ data: mockResponse })

      const { verifyReceipt } = await import('../provider.js')
      await verifyReceipt('base64_receipt_data', true)

      expect(post).toHaveBeenCalledWith(
        'https://sandbox.itunes.apple.com/verifyReceipt',
        expect.any(Object),
      )
    })

    it('should throw on network error', async () => {
      const { post } = await import('@molecule/api-http')
      vi.mocked(post).mockRejectedValue(new Error('Network error'))

      const { verifyReceipt } = await import('../provider.js')

      await expect(verifyReceipt('base64_receipt_data')).rejects.toThrow('Network error')
    })
  })

  describe('getLatestSubscription', () => {
    it('should return the subscription with the latest expiration date', async () => {
      const { getLatestSubscription } = await import('../provider.js')

      const response: VerifyReceiptResponse = {
        status: 0,
        latest_receipt_info: [
          {
            quantity: '1',
            product_id: 'com.example.premium',
            transaction_id: 'txn_1',
            original_transaction_id: 'orig_txn_1',
            purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            purchase_date_ms: '1699920000000',
            purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            original_purchase_date_ms: '1699920000000',
            original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            expires_date_ms: '1702512000000',
          },
          {
            quantity: '1',
            product_id: 'com.example.premium',
            transaction_id: 'txn_2',
            original_transaction_id: 'orig_txn_1',
            purchase_date: '2023-12-14 00:00:00 Etc/GMT',
            purchase_date_ms: '1702512000000',
            purchase_date_pst: '2023-12-13 16:00:00 America/Los_Angeles',
            original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            original_purchase_date_ms: '1699920000000',
            original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            expires_date_ms: '1705104000000', // Latest
          },
        ],
      }

      const result = getLatestSubscription(response)

      expect(result).toBeDefined()
      expect(result!.transaction_id).toBe('txn_2')
    })

    it('should return null when no subscriptions exist', async () => {
      const { getLatestSubscription } = await import('../provider.js')

      const response: VerifyReceiptResponse = {
        status: 0,
        latest_receipt_info: [],
      }

      const result = getLatestSubscription(response)

      expect(result).toBeNull()
    })

    it('should skip items without expiration date', async () => {
      const { getLatestSubscription } = await import('../provider.js')

      const response: VerifyReceiptResponse = {
        status: 0,
        latest_receipt_info: [
          {
            quantity: '1',
            product_id: 'com.example.consumable',
            transaction_id: 'txn_1',
            original_transaction_id: 'orig_txn_1',
            purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            purchase_date_ms: '1699920000000',
            purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            original_purchase_date_ms: '1699920000000',
            original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            // No expires_date_ms - consumable item
          },
          {
            quantity: '1',
            product_id: 'com.example.premium',
            transaction_id: 'txn_2',
            original_transaction_id: 'orig_txn_2',
            purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            purchase_date_ms: '1699920000000',
            purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
            original_purchase_date_ms: '1699920000000',
            original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
            expires_date_ms: '1702512000000',
          },
        ],
      }

      const result = getLatestSubscription(response)

      expect(result).toBeDefined()
      expect(result!.transaction_id).toBe('txn_2')
    })

    it('should fallback to receipt.in_app when latest_receipt_info is empty', async () => {
      const { getLatestSubscription } = await import('../provider.js')

      const response: VerifyReceiptResponse = {
        status: 0,
        receipt: {
          bundle_id: 'com.example.app',
          application_version: '1.0.0',
          in_app: [
            {
              quantity: '1',
              product_id: 'com.example.premium',
              transaction_id: 'txn_1',
              original_transaction_id: 'orig_txn_1',
              purchase_date: '2023-11-14 00:00:00 Etc/GMT',
              purchase_date_ms: '1699920000000',
              purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
              original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
              original_purchase_date_ms: '1699920000000',
              original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
              expires_date_ms: '1702512000000',
            },
          ],
        },
      }

      const result = getLatestSubscription(response)

      expect(result).toBeDefined()
      expect(result!.transaction_id).toBe('txn_1')
    })
  })

  describe('isSubscriptionActive', () => {
    it('should return true for an active subscription', async () => {
      const { isSubscriptionActive } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() + 86400000), // 1 day in future
      }

      expect(isSubscriptionActive(subscription)).toBe(true)
    })

    it('should return false for an expired subscription', async () => {
      const { isSubscriptionActive } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() - 86400000), // 1 day in past
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for a canceled subscription', async () => {
      const { isSubscriptionActive } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() + 86400000),
        cancellation_date: '2023-11-15 00:00:00 Etc/GMT',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for null subscription', async () => {
      const { isSubscriptionActive } = await import('../provider.js')

      expect(isSubscriptionActive(null)).toBe(false)
    })

    it('should return false for subscription without expiration', async () => {
      const { isSubscriptionActive } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.consumable',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })
  })

  describe('normalizeSubscription', () => {
    it('should normalize an active subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const futureDate = Date.now() + 86400000
      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(futureDate),
      }

      const normalized = normalizeSubscription(subscription)

      expect(normalized.provider).toBe('apple')
      expect(normalized.subscriptionId).toBe('orig_txn_123')
      expect(normalized.productId).toBe('com.example.premium')
      expect(normalized.status).toBe('active')
      expect(normalized.isActive).toBe(true)
      expect(normalized.currentPeriodStart).toBe(1699920000000)
      expect(normalized.currentPeriodEnd).toBe(futureDate)
      expect(normalized.willRenew).toBe(true)
      expect(normalized.canceledAt).toBeUndefined()
    })

    it('should normalize a trialing subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() + 86400000),
        is_trial_period: 'true',
      }

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('trialing')
      expect(normalized.isActive).toBe(true)
    })

    it('should normalize a canceled subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() + 86400000),
        cancellation_date: '2023-11-15 00:00:00 Etc/GMT',
        cancellation_date_ms: '1700006400000',
      }

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('canceled')
      expect(normalized.isActive).toBe(false)
      expect(normalized.willRenew).toBe(false)
      expect(normalized.canceledAt).toBe(1700006400000)
    })

    it('should normalize an expired subscription', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() - 86400000), // Expired
      }

      const normalized = normalizeSubscription(subscription)

      expect(normalized.status).toBe('expired')
      expect(normalized.isActive).toBe(false)
      expect(normalized.willRenew).toBe(false)
    })

    it('should include raw data', async () => {
      const { normalizeSubscription } = await import('../provider.js')

      const subscription: InAppPurchase = {
        quantity: '1',
        product_id: 'com.example.premium',
        transaction_id: 'txn_123',
        original_transaction_id: 'orig_txn_123',
        purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        purchase_date_ms: '1699920000000',
        purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        original_purchase_date: '2023-11-14 00:00:00 Etc/GMT',
        original_purchase_date_ms: '1699920000000',
        original_purchase_date_pst: '2023-11-13 16:00:00 America/Los_Angeles',
        expires_date_ms: String(Date.now() + 86400000),
      }

      const normalized = normalizeSubscription(subscription)

      expect(normalized.rawData).toBe(subscription)
    })
  })
})
