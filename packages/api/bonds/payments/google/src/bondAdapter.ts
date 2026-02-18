/**
 * Bond adapter for Google Play payments.
 *
 * Wraps the Google Play verification functions to satisfy the PaymentProvider
 * interface from `@molecule/api-bond`.
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

import { acknowledgeSubscription, verifySubscription } from './verification.js'

/**
 * Google RTDN (Real-Time Developer Notification) notification types.
 *
 * @see https://developer.android.com/google/play/billing/rtdn-reference
 */
const notificationTypeMap: Record<number, string> = {
  1: 'renewed', // SUBSCRIPTION_RECOVERED
  2: 'renewed', // SUBSCRIPTION_RENEWED
  3: 'canceled', // SUBSCRIPTION_CANCELED
  4: 'renewed', // SUBSCRIPTION_PURCHASED
  5: 'on_hold', // SUBSCRIPTION_ON_HOLD
  6: 'grace_period', // SUBSCRIPTION_IN_GRACE_PERIOD
  7: 'renewed', // SUBSCRIPTION_RESTARTED
  8: 'price_change', // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
  9: 'deferred', // SUBSCRIPTION_DEFERRED
  10: 'paused', // SUBSCRIPTION_PAUSED
  11: 'paused', // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
  12: 'revoked', // SUBSCRIPTION_REVOKED
  13: 'expired', // SUBSCRIPTION_EXPIRED
}

/**
 * Shape of the decoded RTDN message data from Google Pub/Sub.
 */
interface RTDNData {
  subscriptionNotification?: {
    notificationType?: number
    purchaseToken?: string
    subscriptionId?: string
  }
  packageName?: string
  eventTimeMillis?: string
}

/**
 * Shape of the raw Google Pub/Sub push message body.
 */
interface PubSubBody {
  subscription?: string
  message?: {
    data?: string
    messageId?: string
    publishTime?: string
  }
}

/**
 * PaymentProvider-compatible object for Google Play purchases.
 */
export const paymentProvider: PaymentProvider = {
  providerName: 'google',
  verifyFlow: 'receipt',
  notificationFlow: 'server-notification',

  /**
   * Verifies a Google Play subscription purchase.
   *
   * @param receipt - The purchase token from Google Play
   * @param productId - The subscription product ID
   * @returns VerifiedSubscription or null if verification fails
   */
  async verifyPurchase(receipt: string, productId: string): Promise<VerifiedSubscription | null> {
    try {
      const subscription = await verifySubscription(productId, receipt)

      if (!subscription) {
        return null
      }

      const lineItem = subscription.lineItems?.[0]

      const verified: VerifiedSubscription = {
        productId,
        transactionId: subscription.latestOrderId ?? undefined,
        expiresAt: lineItem?.expiryTime ?? undefined,
        autoRenews: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? undefined,
        data: subscription,
      }

      // Acknowledge the subscription so Google knows it was delivered.
      try {
        await acknowledgeSubscription(productId, receipt)
      } catch (ackError) {
        // Acknowledgement failure is non-fatal; the subscription is still verified.
        logger.error('Google Play: failed to acknowledge subscription:', ackError)
      }

      return verified
    } catch (error) {
      logger.error('Google Play: verifyPurchase error:', error)
      return null
    }
  },

  /**
   * Parses a Google Play RTDN (Real-Time Developer Notification).
   *
   * Google sends notifications via Pub/Sub with a base64-encoded JSON payload
   * in message.data.
   *
   * @param body - The raw Pub/Sub push message body
   * @returns ParsedNotification or null if the notification cannot be parsed
   */
  async parseNotification(body: unknown): Promise<ParsedNotification | null> {
    try {
      const pubSubBody = body as PubSubBody

      if (!pubSubBody?.message?.data) {
        logger.error('Google Play: parseNotification missing message.data')
        return null
      }

      // Decode the base64-encoded data from Pub/Sub.
      let data: RTDNData

      if (typeof pubSubBody.message.data === 'string') {
        const decoded = Buffer.from(pubSubBody.message.data, 'base64').toString('utf-8')
        data = JSON.parse(decoded)
      } else {
        // Already parsed (some middleware may have decoded it).
        data = pubSubBody.message.data as unknown as RTDNData
      }

      const notification = data.subscriptionNotification

      if (!notification) {
        logger.error('Google Play: parseNotification missing subscriptionNotification')
        return null
      }

      const notificationType = notification.notificationType
      const type =
        notificationType != null ? (notificationTypeMap[notificationType] ?? 'unknown') : 'unknown'

      const parsed: ParsedNotification = {
        transactionId: notification.subscriptionId,
        productId: notification.subscriptionId,
        type,
      }

      // If we have a purchase token, verify the subscription to get expiry details.
      if (notification.purchaseToken && notification.subscriptionId) {
        try {
          const subscription = await verifySubscription(
            notification.subscriptionId,
            notification.purchaseToken,
          )

          if (subscription) {
            const lineItem = subscription.lineItems?.[0]
            parsed.expiresAt = lineItem?.expiryTime ?? undefined
            parsed.autoRenews = lineItem?.autoRenewingPlan?.autoRenewEnabled ?? undefined

            if (subscription.latestOrderId) {
              parsed.transactionId = subscription.latestOrderId
            }
          }
        } catch (verifyError) {
          // Verification failure is non-fatal; we still return the parsed notification.
          logger.error('Google Play: parseNotification verify error:', verifyError)
        }
      }

      return parsed
    } catch (error) {
      logger.error('Google Play: parseNotification error:', error)
      return null
    }
  },
}
