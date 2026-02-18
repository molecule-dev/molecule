/**
 * Tests for `@molecule/api-payments`
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  isActiveStatus,
  type NormalizedPurchase,
  type NormalizedSubscription,
  type PaymentProviderName,
  type PurchaseVerifier,
  type SubscriptionStatus,
  type SubscriptionVerifier,
} from '../index.js'

describe('@molecule/api-payments', () => {
  describe('isActiveStatus', () => {
    it('returns true for active status', () => {
      expect(isActiveStatus('active')).toBe(true)
    })

    it('returns true for trialing status', () => {
      expect(isActiveStatus('trialing')).toBe(true)
    })

    it('returns false for canceled status', () => {
      expect(isActiveStatus('canceled')).toBe(false)
    })

    it('returns false for expired status', () => {
      expect(isActiveStatus('expired')).toBe(false)
    })

    it('returns false for past_due status', () => {
      expect(isActiveStatus('past_due')).toBe(false)
    })

    it('returns false for paused status', () => {
      expect(isActiveStatus('paused')).toBe(false)
    })

    it('returns false for pending status', () => {
      expect(isActiveStatus('pending')).toBe(false)
    })

    it('returns false for unknown status', () => {
      expect(isActiveStatus('unknown')).toBe(false)
    })

    it('handles all SubscriptionStatus values', () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'canceled',
        'expired',
        'past_due',
        'trialing',
        'paused',
        'pending',
        'unknown',
      ]

      const activeStatuses = statuses.filter(isActiveStatus)
      const inactiveStatuses = statuses.filter((s) => !isActiveStatus(s))

      expect(activeStatuses).toEqual(['active', 'trialing'])
      expect(inactiveStatuses).toEqual([
        'canceled',
        'expired',
        'past_due',
        'paused',
        'pending',
        'unknown',
      ])
    })
  })

  describe('PaymentProviderName type', () => {
    it('accepts valid provider values', () => {
      const stripe: PaymentProviderName = 'stripe'
      const apple: PaymentProviderName = 'apple'
      const google: PaymentProviderName = 'google'

      expect(stripe).toBe('stripe')
      expect(apple).toBe('apple')
      expect(google).toBe('google')
    })

    it('can be used in array', () => {
      const providers: PaymentProviderName[] = ['stripe', 'apple', 'google']
      expect(providers).toHaveLength(3)
    })
  })

  describe('SubscriptionStatus type', () => {
    it('accepts all valid status values', () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'canceled',
        'expired',
        'past_due',
        'trialing',
        'paused',
        'pending',
        'unknown',
      ]

      expect(statuses).toHaveLength(8)
    })
  })

  describe('NormalizedSubscription interface', () => {
    it('can create a minimal valid subscription', () => {
      const subscription: NormalizedSubscription = {
        provider: 'stripe',
        subscriptionId: 'sub_123',
        productId: 'prod_456',
        status: 'active',
        isActive: true,
        rawData: {},
      }

      expect(subscription.provider).toBe('stripe')
      expect(subscription.subscriptionId).toBe('sub_123')
      expect(subscription.productId).toBe('prod_456')
      expect(subscription.status).toBe('active')
      expect(subscription.isActive).toBe(true)
      expect(subscription.rawData).toEqual({})
    })

    it('can create a subscription with all optional fields', () => {
      const now = Date.now()
      const subscription: NormalizedSubscription = {
        provider: 'apple',
        subscriptionId: 'sub_789',
        productId: 'prod_abc',
        status: 'canceled',
        isActive: false,
        currentPeriodStart: now - 30 * 24 * 60 * 60 * 1000,
        currentPeriodEnd: now,
        willRenew: false,
        canceledAt: now - 7 * 24 * 60 * 60 * 1000,
        rawData: { originalTransactionId: 'txn_123' },
      }

      expect(subscription.currentPeriodStart).toBeDefined()
      expect(subscription.currentPeriodEnd).toBeDefined()
      expect(subscription.willRenew).toBe(false)
      expect(subscription.canceledAt).toBeDefined()
    })

    it('can have any type for rawData', () => {
      const subscriptionWithObject: NormalizedSubscription = {
        provider: 'stripe',
        subscriptionId: 'sub_1',
        productId: 'prod_1',
        status: 'active',
        isActive: true,
        rawData: { nested: { data: true } },
      }

      const subscriptionWithArray: NormalizedSubscription = {
        provider: 'google',
        subscriptionId: 'sub_2',
        productId: 'prod_2',
        status: 'trialing',
        isActive: true,
        rawData: [1, 2, 3],
      }

      const subscriptionWithNull: NormalizedSubscription = {
        provider: 'apple',
        subscriptionId: 'sub_3',
        productId: 'prod_3',
        status: 'expired',
        isActive: false,
        rawData: null,
      }

      expect(subscriptionWithObject.rawData).toEqual({ nested: { data: true } })
      expect(subscriptionWithArray.rawData).toEqual([1, 2, 3])
      expect(subscriptionWithNull.rawData).toBeNull()
    })

    it('works with all provider types', () => {
      const providers: PaymentProviderName[] = ['stripe', 'apple', 'google']

      const subscriptions = providers.map(
        (provider): NormalizedSubscription => ({
          provider,
          subscriptionId: `sub_${provider}`,
          productId: `prod_${provider}`,
          status: 'active',
          isActive: true,
          rawData: {},
        }),
      )

      expect(subscriptions).toHaveLength(3)
      expect(subscriptions.map((s) => s.provider)).toEqual(providers)
    })

    it('works with all status types', () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'canceled',
        'expired',
        'past_due',
        'trialing',
        'paused',
        'pending',
        'unknown',
      ]

      const subscriptions = statuses.map(
        (status): NormalizedSubscription => ({
          provider: 'stripe',
          subscriptionId: `sub_${status}`,
          productId: 'prod_1',
          status,
          isActive: isActiveStatus(status),
          rawData: {},
        }),
      )

      expect(subscriptions).toHaveLength(8)
      expect(subscriptions.filter((s) => s.isActive)).toHaveLength(2)
    })
  })

  describe('NormalizedPurchase interface', () => {
    it('can create a valid purchase', () => {
      const purchase: NormalizedPurchase = {
        provider: 'apple',
        purchaseId: 'purchase_123',
        productId: 'prod_iap_1',
        isValid: true,
        purchaseDate: Date.now(),
        rawData: { receipt: 'base64data' },
      }

      expect(purchase.provider).toBe('apple')
      expect(purchase.purchaseId).toBe('purchase_123')
      expect(purchase.productId).toBe('prod_iap_1')
      expect(purchase.isValid).toBe(true)
      expect(purchase.purchaseDate).toBeDefined()
      expect(purchase.rawData).toEqual({ receipt: 'base64data' })
    })

    it('can create an invalid purchase', () => {
      const purchase: NormalizedPurchase = {
        provider: 'google',
        purchaseId: 'purchase_invalid',
        productId: 'prod_iap_2',
        isValid: false,
        purchaseDate: Date.now(),
        rawData: { error: 'receipt_invalid' },
      }

      expect(purchase.isValid).toBe(false)
    })

    it('works with all provider types', () => {
      const providers: PaymentProviderName[] = ['stripe', 'apple', 'google']

      const purchases = providers.map(
        (provider): NormalizedPurchase => ({
          provider,
          purchaseId: `purchase_${provider}`,
          productId: `prod_${provider}`,
          isValid: true,
          purchaseDate: Date.now(),
          rawData: {},
        }),
      )

      expect(purchases).toHaveLength(3)
      expect(purchases.map((p) => p.provider)).toEqual(providers)
    })

    it('can have any type for rawData', () => {
      const purchaseWithObject: NormalizedPurchase = {
        provider: 'stripe',
        purchaseId: 'p_1',
        productId: 'prod_1',
        isValid: true,
        purchaseDate: Date.now(),
        rawData: { charge: { id: 'ch_123' } },
      }

      const purchaseWithNull: NormalizedPurchase = {
        provider: 'apple',
        purchaseId: 'p_2',
        productId: 'prod_2',
        isValid: false,
        purchaseDate: Date.now(),
        rawData: null,
      }

      expect(purchaseWithObject.rawData).toEqual({ charge: { id: 'ch_123' } })
      expect(purchaseWithNull.rawData).toBeNull()
    })
  })

  describe('SubscriptionVerifier interface', () => {
    it('can implement verifySubscription method', async () => {
      const mockVerifier: SubscriptionVerifier = {
        async verifySubscription(
          productId: string,
          token: string,
        ): Promise<NormalizedSubscription | null> {
          if (token === 'valid_token') {
            return {
              provider: 'stripe',
              subscriptionId: 'sub_123',
              productId,
              status: 'active',
              isActive: true,
              rawData: { token },
            }
          }
          return null
        },
      }

      const result = await mockVerifier.verifySubscription('prod_premium', 'valid_token')

      expect(result).not.toBeNull()
      expect(result?.productId).toBe('prod_premium')
      expect(result?.status).toBe('active')
    })

    it('returns null for invalid token', async () => {
      const mockVerifier: SubscriptionVerifier = {
        async verifySubscription(): Promise<NormalizedSubscription | null> {
          return null
        },
      }

      const result = await mockVerifier.verifySubscription('prod_1', 'invalid_token')
      expect(result).toBeNull()
    })

    it('can be implemented as a class', async () => {
      class MockSubscriptionVerifier implements SubscriptionVerifier {
        constructor(private readonly provider: PaymentProviderName) {}

        async verifySubscription(
          productId: string,
          token: string,
        ): Promise<NormalizedSubscription | null> {
          return {
            provider: this.provider,
            subscriptionId: `sub_${token}`,
            productId,
            status: 'active',
            isActive: true,
            rawData: {},
          }
        }
      }

      const verifier = new MockSubscriptionVerifier('apple')
      const result = await verifier.verifySubscription('prod_1', 'token_123')

      expect(result?.provider).toBe('apple')
      expect(result?.subscriptionId).toBe('sub_token_123')
    })
  })

  describe('PurchaseVerifier interface', () => {
    it('can implement verifyPurchase method', async () => {
      const mockVerifier: PurchaseVerifier = {
        async verifyPurchase(productId: string, token: string): Promise<NormalizedPurchase | null> {
          if (token === 'valid_receipt') {
            return {
              provider: 'apple',
              purchaseId: 'purchase_abc',
              productId,
              isValid: true,
              purchaseDate: Date.now(),
              rawData: { receipt: token },
            }
          }
          return null
        },
      }

      const result = await mockVerifier.verifyPurchase('prod_coin_pack', 'valid_receipt')

      expect(result).not.toBeNull()
      expect(result?.productId).toBe('prod_coin_pack')
      expect(result?.isValid).toBe(true)
    })

    it('returns null for invalid receipt', async () => {
      const mockVerifier: PurchaseVerifier = {
        async verifyPurchase(): Promise<NormalizedPurchase | null> {
          return null
        },
      }

      const result = await mockVerifier.verifyPurchase('prod_1', 'invalid_receipt')
      expect(result).toBeNull()
    })

    it('can be implemented as a class', async () => {
      class MockPurchaseVerifier implements PurchaseVerifier {
        constructor(private readonly provider: PaymentProviderName) {}

        async verifyPurchase(productId: string, token: string): Promise<NormalizedPurchase | null> {
          return {
            provider: this.provider,
            purchaseId: `purchase_${token}`,
            productId,
            isValid: true,
            purchaseDate: Date.now(),
            rawData: {},
          }
        }
      }

      const verifier = new MockPurchaseVerifier('google')
      const result = await verifier.verifyPurchase('prod_1', 'token_xyz')

      expect(result?.provider).toBe('google')
      expect(result?.purchaseId).toBe('purchase_token_xyz')
    })
  })

  describe('Type compatibility', () => {
    it('SubscriptionVerifier and PurchaseVerifier are compatible as combined interface', async () => {
      interface CombinedVerifier extends SubscriptionVerifier, PurchaseVerifier {}

      const combinedVerifier: CombinedVerifier = {
        async verifySubscription(
          productId: string,
          token: string,
        ): Promise<NormalizedSubscription | null> {
          return {
            provider: 'stripe',
            subscriptionId: `sub_${token}`,
            productId,
            status: 'active',
            isActive: true,
            rawData: {},
          }
        },
        async verifyPurchase(productId: string, token: string): Promise<NormalizedPurchase | null> {
          return {
            provider: 'stripe',
            purchaseId: `purchase_${token}`,
            productId,
            isValid: true,
            purchaseDate: Date.now(),
            rawData: {},
          }
        },
      }

      const subResult = await combinedVerifier.verifySubscription('prod_1', 'sub_token')
      const purchaseResult = await combinedVerifier.verifyPurchase('prod_2', 'purchase_token')

      expect(subResult?.subscriptionId).toBe('sub_sub_token')
      expect(purchaseResult?.purchaseId).toBe('purchase_purchase_token')
    })

    it('NormalizedSubscription isActive should match isActiveStatus result', () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'canceled',
        'expired',
        'past_due',
        'trialing',
        'paused',
        'pending',
        'unknown',
      ]

      statuses.forEach((status) => {
        const subscription: NormalizedSubscription = {
          provider: 'stripe',
          subscriptionId: 'sub_1',
          productId: 'prod_1',
          status,
          isActive: isActiveStatus(status),
          rawData: {},
        }

        // Verify consistency between status and isActive
        if (status === 'active' || status === 'trialing') {
          expect(subscription.isActive).toBe(true)
        } else {
          expect(subscription.isActive).toBe(false)
        }
      })
    })
  })

  describe('Edge cases', () => {
    it('handles empty strings in subscription IDs', () => {
      const subscription: NormalizedSubscription = {
        provider: 'stripe',
        subscriptionId: '',
        productId: '',
        status: 'unknown',
        isActive: false,
        rawData: null,
      }

      expect(subscription.subscriptionId).toBe('')
      expect(subscription.productId).toBe('')
    })

    it('handles zero timestamps', () => {
      const subscription: NormalizedSubscription = {
        provider: 'apple',
        subscriptionId: 'sub_1',
        productId: 'prod_1',
        status: 'active',
        isActive: true,
        currentPeriodStart: 0,
        currentPeriodEnd: 0,
        canceledAt: 0,
        rawData: {},
      }

      expect(subscription.currentPeriodStart).toBe(0)
      expect(subscription.currentPeriodEnd).toBe(0)
      expect(subscription.canceledAt).toBe(0)
    })

    it('handles purchase with zero timestamp', () => {
      const purchase: NormalizedPurchase = {
        provider: 'google',
        purchaseId: 'p_1',
        productId: 'prod_1',
        isValid: true,
        purchaseDate: 0,
        rawData: {},
      }

      expect(purchase.purchaseDate).toBe(0)
    })

    it('handles undefined optional fields correctly', () => {
      const subscription: NormalizedSubscription = {
        provider: 'stripe',
        subscriptionId: 'sub_1',
        productId: 'prod_1',
        status: 'active',
        isActive: true,
        rawData: {},
      }

      expect(subscription.currentPeriodStart).toBeUndefined()
      expect(subscription.currentPeriodEnd).toBeUndefined()
      expect(subscription.willRenew).toBeUndefined()
      expect(subscription.canceledAt).toBeUndefined()
    })
  })
})
