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

      // Reject expired subscriptions — prevent replay of old purchase tokens
      if (lineItem?.expiryTime) {
        const expiresMs = new Date(lineItem.expiryTime).getTime()
        if (Number.isFinite(expiresMs) && expiresMs < Date.now()) {
          logger.warn('Google Play: rejecting expired subscription', {
            productId,
            expiresAt: lineItem.expiryTime,
          })
          return null
        }
      }

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

      // AUTHENTICITY: the RTDN body is attacker-forgeable (Pub/Sub push to a
      // public endpoint), so NOTHING in it is trusted as proof of entitlement.
      // The `purchaseToken` is the only unforgeable credential — re-verify it
      // with Google and derive productId / expiry / order id from the VERIFIED
      // subscription. A forged notification cannot supply a token that verifies.
      // Reject (return null) when the token is missing or verification fails —
      // never copy the attacker-supplied subscriptionId into productId.
      if (!notification.purchaseToken || !notification.subscriptionId) {
        logger.warn(
          'Google Play: parseNotification missing purchaseToken/subscriptionId — cannot verify, rejecting',
        )
        return null
      }

      let subscription: Awaited<ReturnType<typeof verifySubscription>>
      try {
        subscription = await verifySubscription(
          notification.subscriptionId,
          notification.purchaseToken,
        )
      } catch (verifyError) {
        logger.error('Google Play: parseNotification verify error:', verifyError)
        return null
      }

      if (!subscription) {
        logger.warn('Google Play: parseNotification subscription verification failed — rejecting')
        return null
      }

      const lineItem = subscription.lineItems?.[0]

      const parsed: ParsedNotification = {
        transactionId: subscription.latestOrderId ?? notification.subscriptionId,
        productId: lineItem?.productId ?? notification.subscriptionId,
        type,
        expiresAt: lineItem?.expiryTime ?? undefined,
        autoRenews: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? undefined,
      }

      return parsed
    } catch (error) {
      logger.error('Google Play: parseNotification error:', error)
      return null
    }
  },
}
