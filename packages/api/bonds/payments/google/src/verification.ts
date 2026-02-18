/**
 * Google Play purchase verification functions.
 *
 * @module
 */

import type { androidpublisher_v3 } from 'googleapis'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type { NormalizedSubscription, SubscriptionStatus } from '@molecule/api-payments'

import { getPublisher } from './auth.js'

/**
 * Verifies a Google Play subscription purchase using the Android Publisher API v2.
 * @param productId - The Google Play subscription product ID (used for context; the token is the lookup key).
 * @param purchaseToken - The purchase token received from the Google Play client.
 * @returns The raw `SubscriptionPurchaseV2` data from Google, or `null` on error.
 */
export const verifySubscription = async (
  productId: string,
  purchaseToken: string,
): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null> => {
  try {
    const publisher = getPublisher()
    const response = await publisher.purchases.subscriptionsv2.get({
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
      token: purchaseToken,
    })

    return response.data
  } catch (error) {
    logger.error(`Error verifying Google Play subscription:`, error)
    throw error
  }
}

/**
 * Verifies a Google Play one-time (non-subscription) product purchase.
 * @param productId - The Google Play product ID for the one-time purchase.
 * @param purchaseToken - The purchase token received from the Google Play client.
 * @returns The raw `ProductPurchase` data from Google, or `null` on error.
 */
export const verifyProduct = async (
  productId: string,
  purchaseToken: string,
): Promise<androidpublisher_v3.Schema$ProductPurchase | null> => {
  try {
    const publisher = getPublisher()
    const response = await publisher.purchases.products.get({
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
      productId,
      token: purchaseToken,
    })

    return response.data
  } catch (error) {
    logger.error(`Error verifying Google Play product purchase:`, error)
    throw error
  }
}

/**
 * Acknowledges a Google Play subscription purchase. Required by Google to confirm
 * that the server has processed the purchase; unacknowledged purchases are refunded after 3 days.
 * @param productId - The Google Play subscription ID used as `subscriptionId` in the API call.
 * @param purchaseToken - The purchase token received from the Google Play client.
 */
export const acknowledgeSubscription = async (
  productId: string,
  purchaseToken: string,
): Promise<void> => {
  try {
    const publisher = getPublisher()
    await publisher.purchases.subscriptions.acknowledge({
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
      subscriptionId: productId,
      token: purchaseToken,
    })
  } catch (error) {
    logger.error(`Error acknowledging Google Play subscription:`, error)
    throw error
  }
}

/**
 * Acknowledges a Google Play one-time product purchase. Required by Google to confirm
 * that the server has processed the purchase; unacknowledged purchases are refunded after 3 days.
 * @param productId - The Google Play product ID for the one-time purchase.
 * @param purchaseToken - The purchase token received from the Google Play client.
 */
export const acknowledgeProduct = async (
  productId: string,
  purchaseToken: string,
): Promise<void> => {
  try {
    const publisher = getPublisher()
    await publisher.purchases.products.acknowledge({
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
      productId,
      token: purchaseToken,
    })
  } catch (error) {
    logger.error(`Error acknowledging Google Play product purchase:`, error)
    throw error
  }
}

/**
 * Checks whether a Google Play subscription is currently active by comparing its
 * `subscriptionState` against `SUBSCRIPTION_STATE_ACTIVE` and `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`.
 * @param subscription - The Google Play `SubscriptionPurchaseV2` object, or `null`.
 * @returns `true` if the subscription state is active or in a grace period.
 */
export const isSubscriptionActive = (
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null,
): boolean => {
  if (!subscription) return false

  // Check the subscription state
  const activeStates = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']

  return activeStates.includes(subscription.subscriptionState || '')
}

/**
 * Normalizes a Google Play `SubscriptionPurchaseV2` to the provider-agnostic `NormalizedSubscription` interface.
 * Maps Google's `subscriptionState` enum to standard status values and extracts period/renewal info from `lineItems[0]`.
 * @param subscription - The raw Google Play subscription purchase object.
 * @param productId - The product ID to include in the normalized result (not present in the subscription data itself).
 * @returns A `NormalizedSubscription` with provider set to `'google'` and dates converted to millisecond timestamps.
 */
export const normalizeSubscription = (
  subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  productId: string,
): NormalizedSubscription => {
  const stateMap: Record<string, SubscriptionStatus> = {
    SUBSCRIPTION_STATE_PENDING: 'pending',
    SUBSCRIPTION_STATE_ACTIVE: 'active',
    SUBSCRIPTION_STATE_PAUSED: 'paused',
    SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'active',
    SUBSCRIPTION_STATE_ON_HOLD: 'past_due',
    SUBSCRIPTION_STATE_CANCELED: 'canceled',
    SUBSCRIPTION_STATE_EXPIRED: 'expired',
  }

  const lineItem = subscription.lineItems?.[0]
  const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime).getTime() : undefined

  return {
    provider: 'google',
    subscriptionId: subscription.latestOrderId || '',
    productId,
    status: stateMap[subscription.subscriptionState || ''] || 'unknown',
    isActive: isSubscriptionActive(subscription),
    currentPeriodStart: subscription.startTime
      ? new Date(subscription.startTime).getTime()
      : undefined,
    currentPeriodEnd: expiryTime,
    willRenew: lineItem?.autoRenewingPlan?.autoRenewEnabled || false,
    canceledAt: subscription.canceledStateContext?.userInitiatedCancellation?.cancelTime
      ? new Date(subscription.canceledStateContext.userInitiatedCancellation.cancelTime).getTime()
      : undefined,
    rawData: subscription,
  }
}
