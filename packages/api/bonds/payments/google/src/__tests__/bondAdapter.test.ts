/**
 * Tests for Google Play payment bond adapter.
 *
 * Covers verifyPurchase (expired subscription rejection, acknowledge failure tolerance)
 * and parseNotification (base64 decoding, notification type mapping, verify enrichment).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockVerifySubscription,
  mockAcknowledgeSubscription,
  mockVerifyProduct,
  mockAcknowledgeProduct,
  mockLogger,
} = vi.hoisted(() => ({
  mockVerifySubscription: vi.fn(),
  mockAcknowledgeSubscription: vi.fn(),
  mockVerifyProduct: vi.fn(),
  mockAcknowledgeProduct: vi.fn(),
  mockLogger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}))

vi.mock('../verification.js', () => ({
  verifySubscription: mockVerifySubscription,
  acknowledgeSubscription: mockAcknowledgeSubscription,
  verifyProduct: mockVerifyProduct,
  acknowledgeProduct: mockAcknowledgeProduct,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => mockLogger,
}))

// Import after mocks are set up.
const { paymentProvider } = await import('../bondAdapter.js')

/** Helper to build a fake Google SubscriptionPurchaseV2. */
function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    latestOrderId: 'GPA.1234-5678',
    lineItems: [
      {
        expiryTime: new Date(Date.now() + 86_400_000).toISOString(), // +1 day
        autoRenewingPlan: { autoRenewEnabled: true },
      },
    ],
    ...overrides,
  }
}

describe('paymentProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------
  // verifyPurchase
  // ---------------------------------------------------------------
  describe('verifyPurchase', () => {
    it('returns verified subscription with correct fields', async () => {
      const sub = makeSubscription()
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
      expect(result!.productId).toBe('premium_monthly')
      expect(result!.transactionId).toBe('GPA.1234-5678')
      expect(result!.autoRenews).toBe(true)
      expect(result!.data).toBe(sub)
      expect(result!.expiresAt).toBeDefined()
    })

    it('returns null when verifySubscription returns null', async () => {
      mockVerifySubscription.mockResolvedValue(null)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).toBeNull()
    })

    it.each([
      'SUBSCRIPTION_STATE_PENDING',
      'SUBSCRIPTION_STATE_ON_HOLD',
      'SUBSCRIPTION_STATE_PAUSED',
      'SUBSCRIPTION_STATE_REVOKED',
      'SUBSCRIPTION_STATE_EXPIRED',
    ])('returns null for non-entitled state %s (payment not confirmed) [M3-1]', async (state) => {
      // future expiry + product match — only the state gate should reject these.
      mockVerifySubscription.mockResolvedValue(makeSubscription({ subscriptionState: state }))

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).toBeNull()
    })

    it('still grants a CANCELED subscription that is paid through its expiry (Google nuance) [M3-1]', async () => {
      mockVerifySubscription.mockResolvedValue(
        makeSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' }),
      )
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
    })

    it('returns null when verifySubscription throws', async () => {
      mockVerifySubscription.mockRejectedValue(new Error('network error'))

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('RETHROWS a config-not-configured error instead of swallowing it to null [ambiguous-failure]', async () => {
      // A missing GOOGLE_API_SERVICE_KEY_OBJECT/GOOGLE_PLAY_PACKAGE_NAME is a
      // DIFFERENT failure than "invalid purchase" — it must propagate so the
      // resource handler can surface the actionable 503 instead of a generic
      // 400 that reads identically to a genuinely bad purchase token.
      const configError = Object.assign(
        new Error('GOOGLE_PLAY_PACKAGE_NAME is not set — payments is disabled.'),
        { statusCode: 503, errorKey: 'config.notConfigured' },
      )
      mockVerifySubscription.mockRejectedValue(configError)

      await expect(
        paymentProvider.verifyPurchase('token-abc', 'premium_monthly'),
      ).rejects.toMatchObject({ statusCode: 503, errorKey: 'config.notConfigured' })
    })

    it('returns null for expired subscription (anti-replay)', async () => {
      const sub = makeSubscription({
        lineItems: [
          {
            expiryTime: new Date(Date.now() - 86_400_000).toISOString(), // -1 day (expired)
            autoRenewingPlan: { autoRenewEnabled: false },
          },
        ],
      })
      mockVerifySubscription.mockResolvedValue(sub)

      const result = await paymentProvider.verifyPurchase('old-token', 'premium_monthly')

      expect(result).toBeNull()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('rejecting expired subscription'),
        expect.objectContaining({ productId: 'premium_monthly' }),
      )
    })

    it('returns verified for non-expired subscription (expiryTime in the future)', async () => {
      const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString() // +7 days
      const sub = makeSubscription({
        lineItems: [
          {
            expiryTime: futureDate,
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
      expect(result!.expiresAt).toBe(futureDate)
    })

    it('returns verified when expiryTime is missing (no lineItems)', async () => {
      const sub = makeSubscription({ lineItems: undefined })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
      expect(result!.expiresAt).toBeUndefined()
    })

    it('returns verified when expiryTime is invalid (NaN) — Number.isFinite guard', async () => {
      const sub = makeSubscription({
        lineItems: [
          {
            expiryTime: 'not-a-date',
            autoRenewingPlan: { autoRenewEnabled: false },
          },
        ],
      })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      // NaN fails Number.isFinite check, so the expiry guard is skipped
      expect(result).not.toBeNull()
    })

    it('returns verified when lineItems is an empty array', async () => {
      const sub = makeSubscription({ lineItems: [] })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
      expect(result!.expiresAt).toBeUndefined()
      expect(result!.autoRenews).toBeUndefined()
    })

    it('acknowledge failure is non-fatal (still returns verified)', async () => {
      mockVerifySubscription.mockResolvedValue(makeSubscription())
      mockAcknowledgeSubscription.mockRejectedValue(new Error('ack failed'))

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).not.toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to acknowledge'),
        expect.any(Error),
      )
    })

    it('calls acknowledgeSubscription with correct args', async () => {
      mockVerifySubscription.mockResolvedValue(makeSubscription())
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      await paymentProvider.verifyPurchase('my-token', 'premium_yearly')

      expect(mockAcknowledgeSubscription).toHaveBeenCalledWith('premium_yearly', 'my-token')
    })

    it('passes productId and receipt to verifySubscription in correct order', async () => {
      mockVerifySubscription.mockResolvedValue(makeSubscription())
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      await paymentProvider.verifyPurchase('the-token', 'sub-id')

      expect(mockVerifySubscription).toHaveBeenCalledWith('sub-id', 'the-token')
    })

    it('returns transactionId as undefined when latestOrderId is missing', async () => {
      const sub = makeSubscription({ latestOrderId: undefined })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token', 'product')

      expect(result).not.toBeNull()
      expect(result!.transactionId).toBeUndefined()
    })

    it('returns autoRenews as undefined when autoRenewingPlan is absent', async () => {
      const sub = makeSubscription({
        lineItems: [{ expiryTime: new Date(Date.now() + 86_400_000).toISOString() }],
      })
      mockVerifySubscription.mockResolvedValue(sub)
      mockAcknowledgeSubscription.mockResolvedValue(undefined)

      const result = await paymentProvider.verifyPurchase('token', 'product')

      expect(result).not.toBeNull()
      expect(result!.autoRenews).toBeUndefined()
    })
  })

  // ---------------------------------------------------------------
  // parseNotification
  // ---------------------------------------------------------------
  describe('parseNotification', () => {
    /** Encode a notification payload as a Pub/Sub body. */
    function makePubSubBody(data: Record<string, unknown>): Record<string, unknown> {
      return {
        message: {
          data: Buffer.from(JSON.stringify(data)).toString('base64'),
          messageId: 'msg-1',
        },
      }
    }

    it('returns null when message.data is missing', async () => {
      const result = await paymentProvider.parseNotification!({ message: {} })

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('missing message.data'))
    })

    it('returns null when message is missing', async () => {
      const result = await paymentProvider.parseNotification!({})

      expect(result).toBeNull()
    })

    it('REGRESSION: returns null (no grant) when purchaseToken is absent — cannot verify', async () => {
      // A forged RTDN can supply any subscriptionId but not a valid purchaseToken.
      // Without the token there is nothing to verify, so we reject instead of
      // trusting the body-supplied subscriptionId as the product.
      const body = makePubSubBody({
        subscriptionNotification: { notificationType: 1, subscriptionId: 'sub-premium' },
      })

      const result = await paymentProvider.parseNotification!(body)

      expect(result).toBeNull()
      expect(mockVerifySubscription).not.toHaveBeenCalled()
    })

    it('REGRESSION: returns null when subscription verification fails (forged token)', async () => {
      mockVerifySubscription.mockResolvedValue(null)
      const body = makePubSubBody({
        subscriptionNotification: {
          notificationType: 2,
          subscriptionId: 'sub-premium',
          purchaseToken: 'forged-token',
        },
      })

      const result = await paymentProvider.parseNotification!(body)

      expect(mockVerifySubscription).toHaveBeenCalledWith('sub-premium', 'forged-token')
      expect(result).toBeNull()
    })

    it('returns null when verification throws', async () => {
      mockVerifySubscription.mockRejectedValue(new Error('verify boom'))
      const body = makePubSubBody({
        subscriptionNotification: {
          notificationType: 4,
          subscriptionId: 'sub-x',
          purchaseToken: 'pt-xyz',
        },
      })

      const result = await paymentProvider.parseNotification!(body)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('verify error'),
        expect.any(Error),
      )
    })

    it('verifies the token and derives productId/expiry/order id from the VERIFIED subscription', async () => {
      // The verified subscription's product wins, not the body-supplied subscriptionId.
      const sub = {
        latestOrderId: 'GPA.1234-5678',
        lineItems: [
          {
            productId: 'premium_monthly',
            expiryTime: new Date(Date.now() + 86_400_000).toISOString(),
            autoRenewingPlan: { autoRenewEnabled: true },
          },
        ],
      }
      mockVerifySubscription.mockResolvedValue(sub)

      const body = makePubSubBody({
        subscriptionNotification: {
          notificationType: 2,
          subscriptionId: 'sub-product-id',
          purchaseToken: 'pt-abc',
        },
      })

      const result = await paymentProvider.parseNotification!(body)

      expect(mockVerifySubscription).toHaveBeenCalledWith('sub-product-id', 'pt-abc')
      expect(result).not.toBeNull()
      expect(result!.type).toBe('renewed')
      expect(result!.productId).toBe('premium_monthly')
      expect(result!.transactionId).toBe('GPA.1234-5678')
      expect(result!.expiresAt).toBeDefined()
      expect(result!.autoRenews).toBe(true)
    })

    it('maps notificationType on a verified notification (3 → canceled)', async () => {
      mockVerifySubscription.mockResolvedValue(makeSubscription())
      const body = makePubSubBody({
        subscriptionNotification: {
          notificationType: 3,
          subscriptionId: 's',
          purchaseToken: 'pt',
        },
      })

      const result = await paymentProvider.parseNotification!(body)

      expect(result!.type).toBe('canceled')
    })

    it('returns null on JSON parse error', async () => {
      const body = {
        message: {
          data: Buffer.from('not valid json!!!').toString('base64'),
        },
      }

      const result = await paymentProvider.parseNotification!(body)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('returns null when NONE of subscriptionNotification/oneTimeProductNotification/voidedPurchaseNotification/testNotification is present', async () => {
      const body = makePubSubBody({ packageName: 'com.example.app' })

      const result = await paymentProvider.parseNotification!(body)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('none of subscriptionNotification'),
      )
    })

    it('handles already-parsed data (non-string) and still verifies', async () => {
      mockVerifySubscription.mockResolvedValue(makeSubscription())
      const body = {
        message: {
          data: {
            subscriptionNotification: {
              notificationType: 5,
              subscriptionId: 'sub-hold',
              purchaseToken: 'pt-hold',
            },
          },
        },
      }

      const result = await paymentProvider.parseNotification!(body)

      expect(result).not.toBeNull()
      expect(result!.type).toBe('on_hold')
      expect(mockVerifySubscription).toHaveBeenCalledWith('sub-hold', 'pt-hold')
    })

    // ---------------------------------------------------------------
    // oneTimeProductNotification [ambiguous-failure fix]
    // ---------------------------------------------------------------
    describe('oneTimeProductNotification', () => {
      it('REGRESSION: wires a purchased one-time product through verifyProduct/acknowledgeProduct instead of erroring', async () => {
        mockVerifyProduct.mockResolvedValue({
          orderId: 'GPA.one-time-order',
          productId: 'coins_100',
          purchaseState: 0,
        })
        mockAcknowledgeProduct.mockResolvedValue(undefined)

        const body = makePubSubBody({
          oneTimeProductNotification: {
            version: '1.0',
            notificationType: 1, // ONE_TIME_PRODUCT_PURCHASED
            purchaseToken: 'pt-onetime',
            sku: 'coins_100',
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(mockVerifyProduct).toHaveBeenCalledWith('coins_100', 'pt-onetime')
        expect(result).toEqual({
          transactionId: 'GPA.one-time-order',
          productId: 'coins_100',
          type: 'purchased',
        })
        expect(mockAcknowledgeProduct).toHaveBeenCalledWith('coins_100', 'pt-onetime')
        // Never logged as an ERROR — this is now a recognized, handled kind.
        expect(mockLogger.error).not.toHaveBeenCalled()
      })

      it('maps notificationType 2 to canceled and does NOT acknowledge', async () => {
        mockVerifyProduct.mockResolvedValue({ orderId: 'GPA.canceled-order', purchaseState: 1 })

        const body = makePubSubBody({
          oneTimeProductNotification: {
            notificationType: 2, // ONE_TIME_PRODUCT_CANCELED
            purchaseToken: 'pt-canceled',
            sku: 'coins_100',
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result?.type).toBe('canceled')
        expect(mockAcknowledgeProduct).not.toHaveBeenCalled()
      })

      it('rejects (null) without calling verifyProduct when purchaseToken/sku is missing — cannot authenticate', async () => {
        const body = makePubSubBody({
          oneTimeProductNotification: { notificationType: 1, sku: 'coins_100' },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toBeNull()
        expect(mockVerifyProduct).not.toHaveBeenCalled()
      })

      it('REGRESSION: rejects (null) when verifyProduct fails to authenticate the token (forged notification)', async () => {
        mockVerifyProduct.mockResolvedValue(null)

        const body = makePubSubBody({
          oneTimeProductNotification: {
            notificationType: 1,
            purchaseToken: 'forged-token',
            sku: 'coins_100',
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toBeNull()
      })

      it('returns null and logs an error when verifyProduct throws', async () => {
        mockVerifyProduct.mockRejectedValue(new Error('network error'))

        const body = makePubSubBody({
          oneTimeProductNotification: {
            notificationType: 1,
            purchaseToken: 'pt-x',
            sku: 'coins_100',
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toBeNull()
        expect(mockLogger.error).toHaveBeenCalled()
      })
    })

    // ---------------------------------------------------------------
    // voidedPurchaseNotification [ambiguous-failure fix]
    // ---------------------------------------------------------------
    describe('voidedPurchaseNotification', () => {
      it('REGRESSION: maps a voided purchase to a refund notification instead of erroring', async () => {
        const body = makePubSubBody({
          voidedPurchaseNotification: {
            purchaseToken: 'pt-voided',
            orderId: 'GS.0000-0000-0000',
            productType: 1, // subscription
            refundType: 1, // full refund
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toEqual({ transactionId: 'GS.0000-0000-0000', type: 'refund' })
        // No re-verification call is made — see the module doc for why.
        expect(mockVerifySubscription).not.toHaveBeenCalled()
        expect(mockVerifyProduct).not.toHaveBeenCalled()
        expect(mockLogger.error).not.toHaveBeenCalled()
      })

      it('also maps a one-time-product voided purchase (productType=2) to refund', async () => {
        const body = makePubSubBody({
          voidedPurchaseNotification: {
            purchaseToken: 'pt-voided-2',
            orderId: 'GS.1111-1111-1111',
            productType: 2, // one-time product
            refundType: 2, // quantity-based partial refund
          },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toEqual({ transactionId: 'GS.1111-1111-1111', type: 'refund' })
      })

      it('returns null when orderId is missing — nothing to look up', async () => {
        const body = makePubSubBody({
          voidedPurchaseNotification: { purchaseToken: 'pt-voided', productType: 1, refundType: 1 },
        })

        const result = await paymentProvider.parseNotification!(body)

        expect(result).toBeNull()
      })
    })
  })

  // ---------------------------------------------------------------
  // static properties
  // ---------------------------------------------------------------
  describe('static properties', () => {
    it('has providerName set to google', () => {
      expect(paymentProvider.providerName).toBe('google')
    })

    it('has verifyFlow set to receipt', () => {
      expect(paymentProvider.verifyFlow).toBe('receipt')
    })

    it('has notificationFlow set to server-notification', () => {
      expect(paymentProvider.notificationFlow).toBe('server-notification')
    })
  })
})
