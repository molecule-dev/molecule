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
import {
  isConfigNotConfiguredError,
  type ParsedNotification,
  type PaymentProvider,
  type VerifiedSubscription,
} from '@molecule/api-payments'

import {
  acknowledgeProduct,
  acknowledgeSubscription,
  verifyProduct,
  verifySubscription,
} from './verification.js'

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
 * Google RTDN one-time-product notification types.
 *
 * @see https://developer.android.com/google/play/billing/rtdn-reference#one-time
 */
const ONE_TIME_PRODUCT_TYPE_MAP: Record<number, string> = {
  1: 'purchased', // ONE_TIME_PRODUCT_PURCHASED
  2: 'canceled', // ONE_TIME_PRODUCT_CANCELED
}

/**
 * Shape of the decoded RTDN message data from Google Pub/Sub.
 *
 * Exactly one of `subscriptionNotification` / `oneTimeProductNotification` /
 * `voidedPurchaseNotification` / `testNotification` is present per message.
 */
interface RTDNData {
  subscriptionNotification?: {
    notificationType?: number
    purchaseToken?: string
    subscriptionId?: string
  }
  /**
   * A one-time (non-subscription) product purchase or cancellation.
   *
   * @see https://developer.android.com/google/play/billing/rtdn-reference#one-time
   */
  oneTimeProductNotification?: {
    version?: string
    notificationType?: number
    purchaseToken?: string
    sku?: string
  }
  /**
   * A purchase (subscription OR one-time) was voided — refunded or charged
   * back. Unlike the other notification kinds, Google does NOT include a
   * product/SKU identifier here — only `purchaseToken` + `orderId`.
   *
   * @see https://developer.android.com/google/play/billing/rtdn-reference#voided-purchase
   */
  voidedPurchaseNotification?: {
    purchaseToken?: string
    orderId?: string
    /** `1` = subscription, `2` = one-time product. */
    productType?: number
    /** `1` = full refund, `2` = quantity-based partial refund. */
    refundType?: number
  }
  /** Sent by Play Console's "Send test notification" button. */
  testNotification?: {
    version?: string
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

      // SECURITY [M3-1]: trust the product from the VERIFIED subscription, never the
      // caller-supplied productId — otherwise a user buys the cheap tier and passes a
      // premium productId to be granted premium. Mirror Apple's product-match (and the
      // sibling notification path below, which already derives productId from lineItem).
      const verifiedProductId = lineItem?.productId
      if (verifiedProductId && verifiedProductId !== productId) {
        logger.warn('Google Play: product mismatch — rejecting', {
          expected: productId,
          got: verifiedProductId,
        })
        return null
      }

      // [M3-1] Reject non-entitled subscription states (sibling of the Apple gate). The
      // verify path previously gated only on product match + expiry, so a PENDING (deferred
      // payment not yet cleared), ON_HOLD/PAUSED (payment failed/suspended), or REVOKED/EXPIRED
      // token could still be verified into a grant — entitlement without a confirmed payment.
      // Unlike Apple, Google's CANCELED merely turns off auto-renew and the user stays entitled
      // until expiryTime, so deny only the never-paid / no-longer-entitled states and let the
      // expiry check below bound CANCELED/ACTIVE.
      const NON_ENTITLED_STATES = new Set([
        'SUBSCRIPTION_STATE_PENDING',
        'SUBSCRIPTION_STATE_ON_HOLD',
        'SUBSCRIPTION_STATE_PAUSED',
        'SUBSCRIPTION_STATE_REVOKED',
        'SUBSCRIPTION_STATE_EXPIRED',
      ])
      if (NON_ENTITLED_STATES.has(subscription.subscriptionState || '')) {
        logger.warn('Google Play: subscription not entitled (payment not confirmed) — rejecting', {
          productId,
          subscriptionState: subscription.subscriptionState,
        })
        return null
      }

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
        productId: verifiedProductId ?? productId,
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
      // A missing GOOGLE_API_SERVICE_KEY_OBJECT/GOOGLE_PLAY_PACKAGE_NAME is a
      // DIFFERENT failure than "invalid purchase" — rethrow so the resource
      // handler's catch can surface the actionable 503 instead of a generic
      // 400 that reads identically to a genuinely bad purchase token.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
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

      // Play Console's "Send test notification" button sends a testNotification
      // body. It confers no entitlement (still returns null), but it is the
      // integrator's wiring check — logging it as an ERROR made a WORKING
      // Pub/Sub setup look broken.
      if (data.testNotification) {
        logger.info(
          'Google Play: received RTDN test notification — Pub/Sub wiring is working. (No entitlement change.)',
        )
        return null
      }

      if (data.oneTimeProductNotification) {
        return await parseOneTimeProductNotification(data.oneTimeProductNotification)
      }

      if (data.voidedPurchaseNotification) {
        return parseVoidedPurchaseNotification(data.voidedPurchaseNotification)
      }

      const notification = data.subscriptionNotification

      if (!notification) {
        logger.error(
          'Google Play: parseNotification body has none of subscriptionNotification/' +
            'oneTimeProductNotification/voidedPurchaseNotification/testNotification',
        )
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

/**
 * Parses a Google RTDN one-time (non-subscription) product notification.
 *
 * AUTHENTICITY: mirrors the subscription path — the notification's `sku` +
 * `purchaseToken` are re-submitted to Google's `purchases.products.get`
 * (via {@link verifyProduct}) and every field returned is derived from that
 * VERIFIED response, never trusted from the (attacker-forgeable) body.
 *
 * @param notification - The decoded `oneTimeProductNotification` object.
 * @returns The parsed notification (`type: 'purchased' | 'canceled'`), or
 *   `null` if it cannot be authenticated. No `expiresAt` is ever set — a
 *   one-time purchase does not expire the way a subscription does, so a
 *   generic subscription-plan handler that requires `expiresAt` to grant a
 *   plan will correctly no-op on a `'purchased'` notification; consumers
 *   that DO sell one-time products should handle `'purchased'` explicitly.
 */
const parseOneTimeProductNotification = async (
  notification: NonNullable<RTDNData['oneTimeProductNotification']>,
): Promise<ParsedNotification | null> => {
  const notificationType = notification.notificationType
  const type =
    notificationType != null
      ? (ONE_TIME_PRODUCT_TYPE_MAP[notificationType] ?? 'unknown')
      : 'unknown'

  if (!notification.purchaseToken || !notification.sku) {
    logger.warn(
      'Google Play: parseNotification (one-time product) missing purchaseToken/sku — cannot verify, rejecting',
    )
    return null
  }

  let purchase: Awaited<ReturnType<typeof verifyProduct>>
  try {
    purchase = await verifyProduct(notification.sku, notification.purchaseToken)
  } catch (verifyError) {
    logger.error('Google Play: parseNotification (one-time product) verify error:', verifyError)
    return null
  }

  if (!purchase) {
    logger.warn('Google Play: parseNotification (one-time product) verification failed — rejecting')
    return null
  }

  // Acknowledge a fresh purchase so Google knows it was delivered (unacknowledged
  // purchases are refunded after 3 days) — non-fatal, mirrors verifyPurchase.
  if (type === 'purchased') {
    try {
      await acknowledgeProduct(notification.sku, notification.purchaseToken)
    } catch (ackError) {
      logger.error('Google Play: failed to acknowledge one-time product:', ackError)
    }
  }

  return {
    transactionId: purchase.orderId ?? undefined,
    productId: notification.sku,
    type,
  }
}

/**
 * Parses a Google RTDN voided-purchase notification (a refund or chargeback,
 * for either a subscription or a one-time product).
 *
 * Unlike the other notification kinds, Google's voided-purchase payload
 * carries no product/SKU identifier to re-verify against (`purchases.products.get`
 * requires a `productId` the body doesn't supply, and re-deriving one would mean
 * trusting attacker-controlled data) — so this bond does not re-authenticate it
 * against Google's API. It is instead treated the same as a subscription
 * CANCELED/EXPIRED event: `transactionId` (the `orderId`) is used ONLY to look
 * up an EXISTING payment record already bound to a user (never to grant), so a
 * forged notification can at most trigger a revocation-that-does-nothing (no
 * matching record) — it cannot grant or extend entitlement. The endpoint itself
 * is additionally gated by `PAYMENT_NOTIFICATION_REQUIRE_SECRET` upstream.
 *
 * @param notification - The decoded `voidedPurchaseNotification` object.
 * @returns The parsed notification (`type: 'refund'`), or `null` when it carries no `orderId`/`purchaseToken` to act on.
 */
const parseVoidedPurchaseNotification = (
  notification: NonNullable<RTDNData['voidedPurchaseNotification']>,
): ParsedNotification | null => {
  if (!notification.orderId || !notification.purchaseToken) {
    logger.warn('Google Play: parseNotification (voided purchase) missing orderId/purchaseToken')
    return null
  }

  return {
    transactionId: notification.orderId,
    type: 'refund',
  }
}
