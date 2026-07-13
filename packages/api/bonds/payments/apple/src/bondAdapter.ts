/**
 * Bond adapter for the Apple In-App Purchase provider.
 *
 * Wraps the Apple IAP provider functions into the standardized
 * PaymentProvider interface used by `@molecule/api-bond`.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import {
  isConfigNotConfiguredError,
  type ParsedNotification,
  type PaymentProvider,
  type VerifiedSubscription,
} from '@molecule/api-payments'

import { parseV2Notification } from './notificationV2.js'
import {
  describeAppleStatus,
  getAutoRenewStatus,
  getLatestSubscription,
  isSubscriptionActive,
  verifyReceipt as appleVerifyReceipt,
} from './provider.js'
import type { VerifyReceiptResponse } from './types.js'

/**
 * Maps Apple S2S notification_type values to simplified notification types.
 */
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  DID_RENEW: 'renewed',
  DID_CHANGE_RENEWAL_STATUS: 'renewed',
  DID_CHANGE_RENEWAL_PREF: 'renewed',
  CANCEL: 'canceled',
  DID_FAIL_TO_RENEW: 'expired',
  REFUND: 'refund',
  CONSUMPTION_REQUEST: 'refund',
  INITIAL_BUY: 'renewed',
  INTERACTIVE_RENEWAL: 'renewed',
  DID_RECOVER: 'renewed',
  PRICE_INCREASE_CONSENT: 'renewed',
  REVOKE: 'canceled',
}

/**
 * Converts an Apple `expires_date_ms` string to an ISO 8601 date string.
 * @param expiresDateMs - Millisecond timestamp as a string (from Apple's receipt data).
 * @returns An ISO 8601 date string, or `undefined` if the input is missing or not a valid number.
 */
const toISOExpires = (expiresDateMs: string | undefined): string | undefined => {
  if (!expiresDateMs) return undefined
  const ms = parseInt(expiresDateMs, 10)
  if (isNaN(ms)) return undefined
  return new Date(ms).toISOString()
}

/**
 * PaymentProvider-compatible adapter for Apple In-App Purchases.
 *
 * Implements `verifyReceipt` and `parseNotification` from the PaymentProvider interface.
 */
export const paymentProvider: PaymentProvider = {
  providerName: 'apple',
  verifyFlow: 'receipt',
  notificationFlow: 'server-notification',

  /**
   * Verifies an Apple IAP receipt and returns a normalized VerifiedSubscription.
   *
   * @param receipt - Base64-encoded receipt data from the client
   * @param productId - The expected product ID to match against
   * @returns The verified subscription, or null if verification fails or product does not match
   */
  async verifyReceipt(receipt: string, productId: string): Promise<VerifiedSubscription | null> {
    try {
      const response = await appleVerifyReceipt(receipt)

      if (response.status !== 0) {
        // Include the status MEANING: a bare number is ambiguous between a bad
        // receipt and a server misconfiguration (21004 = APPLE_SHARED_SECRET).
        logger.warn(
          `Apple receipt verification returned status ${response.status}: ${describeAppleStatus(response.status)}`,
        )
        return null
      }

      const subscription = getLatestSubscription(response)

      if (!subscription) {
        logger.info('Apple receipt verification: no subscription found in response')
        return null
      }

      if (subscription.product_id !== productId) {
        logger.info(
          `Apple receipt verification: product mismatch (expected ${productId}, got ${subscription.product_id})`,
        )
        return null
      }

      // [M3-1] Reject refunded/revoked/expired subscriptions, mirroring Stripe's isActive
      // gate. Apple keeps returning a refunded receipt with status 0 + a future paid-period
      // expires_date_ms but sets cancellation_date; without this gate a refunded user could
      // re-POST the same receipt to re-grant the plan until the original period end (refund
      // bypass). isSubscriptionActive() is false when cancellation_date is set or expiry has
      // passed; turning off auto-renew mid-period does NOT set cancellation_date, so legit
      // still-paid subscriptions are unaffected.
      if (!isSubscriptionActive(subscription)) {
        logger.info(
          'Apple receipt verification: subscription not active (refunded/revoked/expired) — rejecting',
        )
        return null
      }

      const autoRenews =
        getAutoRenewStatus(response, subscription.original_transaction_id) ??
        isSubscriptionActive(subscription)

      return {
        productId: subscription.product_id,
        transactionId: subscription.original_transaction_id,
        expiresAt: toISOExpires(subscription.expires_date_ms),
        autoRenews,
        data: subscription,
      }
    } catch (error) {
      // A missing APPLE_SHARED_SECRET (appleVerifyReceipt) is a DIFFERENT
      // failure than "invalid receipt" — rethrow so the resource handler's
      // catch can surface the actionable 503 instead of the generic 400 a
      // genuinely bad/forged receipt gets.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('Apple bondAdapter verifyReceipt error:', error)
      return null
    }
  },

  /**
   * Parses an Apple server-to-server notification (v1 OR v2) into a
   * normalized ParsedNotification.
   *
   * **v1** (`notification_type` at the body root): the raw body is
   * attacker-forgeable, so NOTHING in it is trusted directly. The embedded
   * base64 `latest_receipt` is re-submitted to Apple's `verifyReceipt` (which
   * authenticates it with `APPLE_SHARED_SECRET`), and every entitlement field
   * (transactionId / productId / expiresAt / autoRenews) is derived from the
   * VERIFIED receipt — never from the body. A forged notification cannot
   * supply a receipt that Apple verifies, so this returns `null` for it.
   *
   * **v2** (`signedPayload` JWS, no top-level `notification_type`): delegated
   * to {@link parseV2Notification}, which authenticates the JWS x5c
   * certificate chain against Apple's Root CA - G3 (no live call back to
   * Apple needed — the signature chain IS the proof) before trusting any
   * field. See `notificationV2.ts`.
   *
   * @param body - The raw notification body from Apple
   * @returns The parsed notification, or null if it cannot be authenticated
   */
  async parseNotification(body: unknown): Promise<ParsedNotification | null> {
    try {
      if (!body || typeof body !== 'object') {
        logger.warn('Apple parseNotification: invalid body')
        return null
      }

      const notification = body as Record<string, unknown>
      const notificationType = notification.notification_type as string | undefined

      if (!notificationType) {
        // No top-level notification_type — this is either a v2 signedPayload
        // or junk. v2 authenticates itself via its JWS x5c chain (no receipt
        // to re-verify), so dispatch to the v2 parser rather than rejecting.
        const signedPayload = notification.signedPayload as string | undefined
        if (!signedPayload) {
          logger.warn(
            'Apple parseNotification: missing both notification_type (v1) and signedPayload (v2)',
          )
          return null
        }
        return parseV2Notification(signedPayload)
      }

      const type = NOTIFICATION_TYPE_MAP[notificationType] ?? notificationType.toLowerCase()

      // Pull the base64 receipt out of the notification (v1: in unified_receipt,
      // or at the body root). This is the ONLY field we use from the body, and
      // only to re-verify it with Apple — we do not trust its contents.
      const unifiedReceipt = notification.unified_receipt as VerifyReceiptResponse | undefined
      const latestReceipt =
        unifiedReceipt?.latest_receipt ?? (notification.latest_receipt as string | undefined)

      if (!latestReceipt) {
        logger.warn('Apple parseNotification: no latest_receipt to verify — rejecting')
        return null
      }

      // Re-verify the embedded receipt with Apple. A forged notification cannot
      // produce a receipt that returns status 0.
      const verified = await appleVerifyReceipt(latestReceipt)
      if (verified.status !== 0) {
        logger.warn(
          `Apple parseNotification: receipt verification returned status ${verified.status} (${describeAppleStatus(verified.status)}) — rejecting`,
        )
        return null
      }

      const subscription = getLatestSubscription(verified)
      if (!subscription) {
        logger.info('Apple parseNotification: no subscription in verified receipt — rejecting')
        return null
      }

      const autoRenews =
        getAutoRenewStatus(verified, subscription.original_transaction_id) ??
        isSubscriptionActive(subscription)

      return {
        transactionId: subscription.original_transaction_id ?? subscription.transaction_id,
        productId: subscription.product_id,
        type,
        expiresAt: toISOExpires(subscription.expires_date_ms),
        autoRenews,
      }
    } catch (error) {
      logger.error('Apple bondAdapter parseNotification error:', error)
      return null
    }
  },
}
