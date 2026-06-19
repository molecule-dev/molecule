/**
 * Tests for Google Play payment bond adapter.
 *
 * Covers verifyPurchase (expired subscription rejection, acknowledge failure tolerance)
 * and parseNotification (base64 decoding, notification type mapping, verify enrichment).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockVerifySubscription, mockAcknowledgeSubscription, mockLogger } = vi.hoisted(() => ({
  mockVerifySubscription: vi.fn(),
  mockAcknowledgeSubscription: vi.fn(),
  mockLogger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}))

vi.mock('../verification.js', () => ({
  verifySubscription: mockVerifySubscription,
  acknowledgeSubscription: mockAcknowledgeSubscription,
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

    it('returns null when verifySubscription throws', async () => {
      mockVerifySubscription.mockRejectedValue(new Error('network error'))

      const result = await paymentProvider.verifyPurchase('token-abc', 'premium_monthly')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
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

    it('returns null when subscriptionNotification is missing', async () => {
      const body = makePubSubBody({ packageName: 'com.example.app' })

      const result = await paymentProvider.parseNotification!(body)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('missing subscriptionNotification'),
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
