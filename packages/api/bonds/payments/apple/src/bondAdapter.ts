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
import type {
  ParsedNotification,
  PaymentProvider,
  VerifiedSubscription,
} from '@molecule/api-payments'

import {
  getLatestSubscription,
  isSubscriptionActive,
  verifyReceipt as appleVerifyReceipt,
} from './provider.js'
import type { PendingRenewal, VerifyReceiptResponse } from './types.js'

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
 * Checks whether a subscription's pending renewal info indicates auto-renew is enabled.
 * @param response - The Apple receipt verification response containing `pending_renewal_info`.
 * @param originalTransactionId - The original transaction ID to match in the renewal info array.
 * @returns `true` if auto-renew is on, `false` if off, or `undefined` if no matching renewal info found.
 */
const getAutoRenewStatus = (
  response: VerifyReceiptResponse,
  originalTransactionId: string,
): boolean | undefined => {
  const renewal = response.pending_renewal_info?.find(
    (r: PendingRenewal) => r.original_transaction_id === originalTransactionId,
  )

  if (!renewal) return undefined

  return renewal.auto_renew_status === '1'
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
        logger.warn(`Apple receipt verification returned status ${response.status}`)
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
      logger.error('Apple bondAdapter verifyReceipt error:', error)
      return null
    }
  },

  /**
   * Parses an Apple server-to-server notification into a normalized ParsedNotification.
   *
   * Handles both v1 (notification_type at top level) and v2 (signedPayload-based)
   * notification formats, though v2 signed payloads must be decoded upstream.
   *
   * @param body - The raw notification body from Apple
   * @returns The parsed notification, or null if the body cannot be parsed
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
        logger.warn('Apple parseNotification: missing notification_type')
        return null
      }

      const type = NOTIFICATION_TYPE_MAP[notificationType] ?? notificationType.toLowerCase()

      // Extract the latest receipt info from the unified_receipt (v1 format)
      const unifiedReceipt = notification.unified_receipt as VerifyReceiptResponse | undefined
      const latestReceiptInfo =
        unifiedReceipt?.latest_receipt_info ??
        (notification.latest_receipt_info as VerifyReceiptResponse['latest_receipt_info'])

      // Get the most recent transaction from the receipt info
      const latestTransaction = latestReceiptInfo?.reduce<
        (typeof latestReceiptInfo)[number] | null
      >((latest, current) => {
        if (!latest) return current
        const currentMs = parseInt(current.expires_date_ms || '0', 10)
        const latestMs = parseInt(latest.expires_date_ms || '0', 10)
        return currentMs > latestMs ? current : latest
      }, null)

      // Check pending_renewal_info for auto-renew status
      const pendingRenewalInfo =
        unifiedReceipt?.pending_renewal_info ??
        (notification.pending_renewal_info as PendingRenewal[] | undefined)

      const autoRenews = pendingRenewalInfo?.[0]?.auto_renew_status === '1'

      return {
        transactionId:
          latestTransaction?.original_transaction_id ?? latestTransaction?.transaction_id,
        productId: latestTransaction?.product_id ?? pendingRenewalInfo?.[0]?.auto_renew_product_id,
        type,
        expiresAt: toISOExpires(latestTransaction?.expires_date_ms),
        autoRenews,
      }
    } catch (error) {
      logger.error('Apple bondAdapter parseNotification error:', error)
      return null
    }
  },
}
