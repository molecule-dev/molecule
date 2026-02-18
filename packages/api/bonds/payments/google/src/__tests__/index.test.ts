/**
 * Tests for the Google Play verification functions.
 *
 * @module
 */

import type { androidpublisher_v3 } from 'googleapis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock googleapis
const mockSubscriptionsV2Get = vi.fn()
const mockProductsGet = vi.fn()
const mockSubscriptionsAcknowledge = vi.fn()
const mockProductsAcknowledge = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: vi.fn(function () {
        return {}
      }),
    },
    androidpublisher: vi.fn(function () {
      return {
        purchases: {
          subscriptionsv2: { get: mockSubscriptionsV2Get },
          products: { get: mockProductsGet, acknowledge: mockProductsAcknowledge },
          subscriptions: { acknowledge: mockSubscriptionsAcknowledge },
        },
      }
    }),
  },
}))

describe('Google Play Verification', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLAY_PACKAGE_NAME', 'com.example.app')
    vi.stubEnv(
      'GOOGLE_API_SERVICE_KEY_OBJECT',
      JSON.stringify({
        client_email: 'test@example.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n',
      }),
    )
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('verifySubscription', () => {
    it('should verify a subscription purchase', async () => {
      const mockSubscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        latestOrderId: 'GPA.1234-5678-9012',
        startTime: '2023-11-14T00:00:00Z',
        lineItems: [
          {
            productId: 'premium_monthly',
            expiryTime: '2023-12-14T00:00:00Z',
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      }

      mockSubscriptionsV2Get.mockResolvedValue({ data: mockSubscription })

      const { verifySubscription } = await import('../verification.js')
      const result = await verifySubscription('premium_monthly', 'test_token')

      expect(result).toEqual(mockSubscription)
      expect(mockSubscriptionsV2Get).toHaveBeenCalledWith({
        packageName: 'com.example.app',
        token: 'test_token',
      })
    })

    it('should throw on verification error', async () => {
      mockSubscriptionsV2Get.mockRejectedValue(new Error('Invalid token'))

      const { verifySubscription } = await import('../verification.js')

      await expect(verifySubscription('premium_monthly', 'invalid_token')).rejects.toThrow(
        'Invalid token',
      )
    })
  })

  describe('verifyProduct', () => {
    it('should verify a product purchase', async () => {
      const mockProduct: androidpublisher_v3.Schema$ProductPurchase = {
        purchaseState: 0,
        consumptionState: 0,
        purchaseTimeMillis: '1699920000000',
      }

      mockProductsGet.mockResolvedValue({ data: mockProduct })

      const { verifyProduct } = await import('../verification.js')
      const result = await verifyProduct('coins_100', 'test_token')

      expect(result).toEqual(mockProduct)
      expect(mockProductsGet).toHaveBeenCalledWith({
        packageName: 'com.example.app',
        productId: 'coins_100',
        token: 'test_token',
      })
    })

    it('should throw on verification error', async () => {
      mockProductsGet.mockRejectedValue(new Error('Invalid token'))

      const { verifyProduct } = await import('../verification.js')

      await expect(verifyProduct('coins_100', 'invalid_token')).rejects.toThrow('Invalid token')
    })
  })

  describe('acknowledgeSubscription', () => {
    it('should acknowledge a subscription', async () => {
      mockSubscriptionsAcknowledge.mockResolvedValue({})

      const { acknowledgeSubscription } = await import('../verification.js')
      await acknowledgeSubscription('premium_monthly', 'test_token')

      expect(mockSubscriptionsAcknowledge).toHaveBeenCalledWith({
        packageName: 'com.example.app',
        subscriptionId: 'premium_monthly',
        token: 'test_token',
      })
    })

    it('should throw on acknowledge error', async () => {
      mockSubscriptionsAcknowledge.mockRejectedValue(new Error('Already acknowledged'))

      const { acknowledgeSubscription } = await import('../verification.js')

      await expect(acknowledgeSubscription('premium_monthly', 'test_token')).rejects.toThrow(
        'Already acknowledged',
      )
    })
  })

  describe('acknowledgeProduct', () => {
    it('should acknowledge a product purchase', async () => {
      mockProductsAcknowledge.mockResolvedValue({})

      const { acknowledgeProduct } = await import('../verification.js')
      await acknowledgeProduct('coins_100', 'test_token')

      expect(mockProductsAcknowledge).toHaveBeenCalledWith({
        packageName: 'com.example.app',
        productId: 'coins_100',
        token: 'test_token',
      })
    })

    it('should throw on acknowledge error', async () => {
      mockProductsAcknowledge.mockRejectedValue(new Error('Already acknowledged'))

      const { acknowledgeProduct } = await import('../verification.js')

      await expect(acknowledgeProduct('coins_100', 'test_token')).rejects.toThrow(
        'Already acknowledged',
      )
    })
  })

  describe('isSubscriptionActive', () => {
    it('should return true for SUBSCRIPTION_STATE_ACTIVE', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
      }

      expect(isSubscriptionActive(subscription)).toBe(true)
    })

    it('should return true for SUBSCRIPTION_STATE_IN_GRACE_PERIOD', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
      }

      expect(isSubscriptionActive(subscription)).toBe(true)
    })

    it('should return false for SUBSCRIPTION_STATE_CANCELED', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_CANCELED',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for SUBSCRIPTION_STATE_EXPIRED', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for SUBSCRIPTION_STATE_ON_HOLD', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ON_HOLD',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for SUBSCRIPTION_STATE_PAUSED', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_PAUSED',
      }

      expect(isSubscriptionActive(subscription)).toBe(false)
    })

    it('should return false for null subscription', async () => {
      const { isSubscriptionActive } = await import('../verification.js')

      expect(isSubscriptionActive(null)).toBe(false)
    })
  })

  describe('normalizeSubscription', () => {
    it('should normalize an active subscription', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        latestOrderId: 'GPA.1234-5678-9012',
        startTime: '2023-11-14T00:00:00.000Z',
        lineItems: [
          {
            productId: 'premium_monthly',
            expiryTime: '2023-12-14T00:00:00.000Z',
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      }

      const normalized = normalizeSubscription(subscription, 'premium_monthly')

      expect(normalized.provider).toBe('google')
      expect(normalized.subscriptionId).toBe('GPA.1234-5678-9012')
      expect(normalized.productId).toBe('premium_monthly')
      expect(normalized.status).toBe('active')
      expect(normalized.isActive).toBe(true)
      expect(normalized.currentPeriodStart).toBe(new Date('2023-11-14T00:00:00.000Z').getTime())
      expect(normalized.currentPeriodEnd).toBe(new Date('2023-12-14T00:00:00.000Z').getTime())
      expect(normalized.willRenew).toBe(true)
      expect(normalized.canceledAt).toBeUndefined()
    })

    it('should normalize a canceled subscription', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_CANCELED',
        latestOrderId: 'GPA.1234-5678-9012',
        startTime: '2023-11-14T00:00:00.000Z',
        canceledStateContext: {
          userInitiatedCancellation: {
            cancelTime: '2023-11-20T00:00:00.000Z',
          },
        },
        lineItems: [
          {
            productId: 'premium_monthly',
            expiryTime: '2023-12-14T00:00:00.000Z',
            autoRenewingPlan: { autoRenewEnabled: false },
          },
        ],
      }

      const normalized = normalizeSubscription(subscription, 'premium_monthly')

      expect(normalized.status).toBe('canceled')
      expect(normalized.isActive).toBe(false)
      expect(normalized.willRenew).toBe(false)
      expect(normalized.canceledAt).toBe(new Date('2023-11-20T00:00:00.000Z').getTime())
    })

    it('should map all Google subscription states correctly', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const stateMap: Record<string, string> = {
        SUBSCRIPTION_STATE_PENDING: 'pending',
        SUBSCRIPTION_STATE_ACTIVE: 'active',
        SUBSCRIPTION_STATE_PAUSED: 'paused',
        SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'active',
        SUBSCRIPTION_STATE_ON_HOLD: 'past_due',
        SUBSCRIPTION_STATE_CANCELED: 'canceled',
        SUBSCRIPTION_STATE_EXPIRED: 'expired',
      }

      for (const [googleState, expectedStatus] of Object.entries(stateMap)) {
        const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
          subscriptionState: googleState,
          latestOrderId: 'GPA.1234-5678-9012',
          lineItems: [{ productId: 'test', autoRenewingPlan: {} }],
        }

        const normalized = normalizeSubscription(subscription, 'test')
        expect(normalized.status).toBe(expectedStatus)
      }
    })

    it('should handle subscription without lineItems', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        latestOrderId: 'GPA.1234-5678-9012',
        startTime: '2023-11-14T00:00:00.000Z',
        lineItems: [],
      }

      const normalized = normalizeSubscription(subscription, 'premium_monthly')

      expect(normalized.currentPeriodEnd).toBeUndefined()
      expect(normalized.willRenew).toBe(false)
    })

    it('should handle unknown subscription state', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'UNKNOWN_STATE',
        latestOrderId: 'GPA.1234-5678-9012',
      }

      const normalized = normalizeSubscription(subscription, 'test')

      expect(normalized.status).toBe('unknown')
    })

    it('should include raw data', async () => {
      const { normalizeSubscription } = await import('../verification.js')

      const subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 = {
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
        latestOrderId: 'GPA.1234-5678-9012',
      }

      const normalized = normalizeSubscription(subscription, 'test')

      expect(normalized.rawData).toBe(subscription)
    })
  })
})

describe('Google Auth', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_PLAY_PACKAGE_NAME', 'com.example.app')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('getAuthClient', () => {
    it('should throw when service key is not configured', async () => {
      vi.stubEnv('GOOGLE_API_SERVICE_KEY_OBJECT', '')
      vi.resetModules()

      const { getAuthClient } = await import('../auth.js')

      expect(() => getAuthClient()).toThrow('Google API service key object not configured')
    })

    it('should create JWT auth client with valid config', async () => {
      vi.stubEnv(
        'GOOGLE_API_SERVICE_KEY_OBJECT',
        JSON.stringify({
          client_email: 'test@example.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        }),
      )
      vi.resetModules()

      const { getAuthClient } = await import('../auth.js')
      const { google } = await import('googleapis')

      getAuthClient()

      expect(google.auth.JWT).toHaveBeenCalledWith({
        email: 'test@example.iam.gserviceaccount.com',
        key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      })
    })
  })
})
