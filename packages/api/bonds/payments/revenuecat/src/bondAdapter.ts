/**
 * Bond adapter for the RevenueCat payment provider.
 *
 * Wraps the RevenueCat REST functions into the standardized PaymentProvider
 * interface used by `@molecule/api-bond`.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import {
  isConfigNotConfiguredError,
  type PaymentProvider,
  type VerifiedSubscription,
  type WebhookEvent,
} from '@molecule/api-payments'

import {
  assertPurchaseEnvironmentAllowed,
  findSubscription,
  getEffectiveExpiry,
  getStoreTransactionId,
  getSubscriber,
  isSubscriptionActive,
  willSubscriptionRenew,
} from './provider.js'
import type { RevenueCatWebhookBody } from './types.js'
import { authenticateWebhook, parseWebhookEvent } from './webhook.js'

/**
 * Converts a millisecond timestamp to an ISO 8601 date string.
 * @param ms - Millisecond timestamp, or `undefined`.
 * @returns An ISO 8601 date string, or `undefined` if the input is missing or not a valid number.
 */
const toISOExpires = (ms: number | undefined): string | undefined => {
  if (ms === undefined || isNaN(ms)) return undefined
  return new Date(ms).toISOString()
}

/**
 * PaymentProvider-compatible adapter for RevenueCat.
 *
 * Implements `verifyReceipt` (receipt-style verification against a customer's
 * RevenueCat entitlements) and `handleWebhookEvent` (authenticated webhook
 * parsing) from the PaymentProvider interface.
 */
export const paymentProvider: PaymentProvider = {
  providerName: 'revenuecat',
  verifyFlow: 'receipt',
  notificationFlow: 'webhook',

  /**
   * Verifies a customer's RevenueCat entitlement and returns a normalized
   * VerifiedSubscription.
   *
   * @param receipt - The customer's RevenueCat App User ID. This is an IDENTIFIER, not a proof of purchase — the calling route must have already authenticated the user and must bind the id to them (see the module remarks in `index.ts`).
   * @param productId - The RevenueCat entitlement identifier OR store product identifier the plan is registered under.
   * @returns The verified subscription, or null if the customer has no active subscription for that identifier.
   */
  async verifyReceipt(receipt: string, productId: string): Promise<VerifiedSubscription | null> {
    try {
      const { subscriber } = await getSubscriber(receipt)

      const match = findSubscription(subscriber, productId)

      if (!match) {
        logger.info(
          `RevenueCat verification: customer has no subscription for ${productId} — rejecting`,
        )
        return null
      }

      // A sandbox purchase costs nothing, so accepting one grants a real plan
      // for free. Fail closed unless REVENUECAT_ALLOW_SANDBOX=true.
      assertPurchaseEnvironmentAllowed(match.subscription.is_sandbox)

      // Reject refunded/expired subscriptions, mirroring Stripe's isActive gate.
      // RevenueCat keeps returning a refunded subscription with its original
      // future expires_date and only sets refunded_at; without this gate a
      // refunded customer could re-verify to re-grant the plan until the
      // original period end (refund bypass). Turning auto-renew off mid-period
      // does NOT set refunded_at, so legitimate still-paid customers pass.
      if (!isSubscriptionActive(match.subscription)) {
        logger.info(
          'RevenueCat verification: subscription not active (refunded/expired) — rejecting',
        )
        return null
      }

      return {
        productId: match.productId,
        // The entitlement identifier, when one grants this product. Apps
        // register their catalogue with either identifier, and the payments
        // core resolves plans against `productId` OR `priceId`.
        priceId: match.entitlementId,
        transactionId: getStoreTransactionId(match.subscription),
        expiresAt: toISOExpires(getEffectiveExpiry(match.subscription)),
        autoRenews: willSubscriptionRenew(match.subscription),
        data: {
          // Persisted by the resource layer as the payment record's customer
          // id, which is how the webhook path (`findByCustomerData`) finds this
          // user again. Without it, every RevenueCat webhook would be dropped.
          customerId: subscriber.original_app_user_id ?? receipt,
          appUserId: receipt,
          entitlementId: match.entitlementId,
          subscription: match.subscription,
        },
      }
    } catch (error) {
      // A missing REVENUECAT_SECRET_API_KEY is a DIFFERENT failure than "not
      // entitled" — rethrow so the resource handler's catch can surface the
      // actionable 503 instead of the generic 400 an unentitled customer gets.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('RevenueCat bondAdapter verifyReceipt error:', error)
      return null
    }
  },

  /**
   * Authenticates and parses a RevenueCat webhook request.
   *
   * The raw body is attacker-forgeable, so NOTHING in it is trusted until the
   * request passes the webhook authentication RevenueCat provides — the shared
   * `Authorization` header value and/or the HMAC-SHA256
   * `X-RevenueCat-Webhook-Signature`. The HMAC is computed over the raw request
   * BYTES, so `req.rawBody` is used in preference to `req.body`; an Express app
   * that only ever exposes a parsed object cannot verify the signature and must
   * capture the raw body (`express.raw()`, or the `verify` hook of
   * `express.json()`).
   *
   * @param req - The incoming request (body, optional rawBody, headers).
   * @returns The normalized webhook event, or null if the request cannot be authenticated or carries no usable event.
   */
  async handleWebhookEvent(req: unknown): Promise<WebhookEvent | null> {
    try {
      const request = req as {
        body?: unknown
        rawBody?: string | Buffer
        headers?: Record<string, string | string[] | undefined>
      }

      const rawBody = request.rawBody ?? request.body

      if (rawBody === undefined || rawBody === null) {
        logger.error('RevenueCat bondAdapter handleWebhookEvent: missing request body.')
        return null
      }

      // The HMAC covers the bytes RevenueCat sent. If only a parsed object is
      // available, re-serializing it is the documented way to FAIL verification
      // on valid requests, so say so rather than silently rejecting.
      const bytes =
        typeof rawBody === 'string' || Buffer.isBuffer(rawBody) ? rawBody : JSON.stringify(rawBody)

      if (!authenticateWebhook(bytes, request.headers)) {
        return null
      }

      const body = (
        typeof rawBody === 'string'
          ? JSON.parse(rawBody)
          : Buffer.isBuffer(rawBody)
            ? JSON.parse(rawBody.toString('utf8'))
            : rawBody
      ) as RevenueCatWebhookBody

      return parseWebhookEvent(body)
    } catch (error) {
      logger.error('RevenueCat bondAdapter handleWebhookEvent error:', error)
      return null
    }
  },
}
