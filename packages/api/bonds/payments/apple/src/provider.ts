/**
 * Apple In-App Purchase provider implementation.
 *
 * Handles verification of Apple App Store receipts for in-app purchases and subscriptions.
 *
 * @see https://developer.apple.com/documentation/storekit/in-app_purchase
 *
 * @remarks
 * **Sandbox receipts are rejected by default (fail-closed).** Accepting an Apple
 * sandbox* receipt grants a real entitlement, so it is a money-affecting
 * decision. Sandbox receipts are freely obtainable by any Apple sandbox tester,
 * so a production deploy that accepts them lets an authenticated user claim the
 * premium plan without paying. Acceptance is therefore gated on an explicit,
 * default-`false` flag — `APPLE_ALLOW_SANDBOX_RECEIPTS=true` (read via
 * `@molecule/api-config`) — NOT on `NODE_ENV`. Gating on `NODE_ENV` failed open
 * whenever a deploy forgot to set it (the scaffold ships `NODE_ENV=development`),
 * mirroring why `PAYMENT_NOTIFICATION_REQUIRE_SECRET` defaults to secure-ON.
 * Enable the flag only for local/CI sandbox testing.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { post } from '@molecule/api-http'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { NormalizedSubscription } from '@molecule/api-payments'

import type { InAppPurchase, VerifyReceiptResponse } from './types.js'

/** Apple's production and sandbox receipt verification endpoint URLs. */
const VERIFY_RECEIPT_URL = {
  production: 'https://buy.itunes.apple.com/verifyReceipt',
  sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt',
}

/**
 * Verifies an App Store receipt.
 *
 * @param receiptData - Base64-encoded receipt data from the App Store client.
 * @param useSandbox - When `true`, sends directly to the sandbox endpoint. When the production endpoint returns status 21007 (a sandbox receipt), it retries against sandbox ONLY if `APPLE_ALLOW_SANDBOX_RECEIPTS=true`; otherwise the sandbox receipt is rejected (fail-closed default).
 * @returns The parsed receipt verification response from Apple.
 * @throws {Error} When a sandbox receipt (status 21007) is presented but `APPLE_ALLOW_SANDBOX_RECEIPTS` is not explicitly enabled.
 */
export const verifyReceipt = async (
  receiptData: string,
  useSandbox = false,
): Promise<VerifyReceiptResponse> => {
  const endpoint = useSandbox ? VERIFY_RECEIPT_URL.sandbox : VERIFY_RECEIPT_URL.production

  try {
    const response = await post<VerifyReceiptResponse>(endpoint, {
      'receipt-data': receiptData,
      password: process.env.APPLE_SHARED_SECRET,
      'exclude-old-transactions': true,
    })

    // Status 21007 means the receipt is from the sandbox environment.
    // Accepting a sandbox receipt grants a real entitlement, so it is a
    // money-affecting decision and is fail-closed: sandbox receipts are rejected
    // unless an operator explicitly opts in via APPLE_ALLOW_SANDBOX_RECEIPTS=true
    // (for local/CI testing). This is NOT gated on NODE_ENV — doing so failed
    // open whenever a deploy forgot to set it (the scaffold ships
    // NODE_ENV=development), letting an attacker claim premium with a free
    // sandbox receipt. Mirrors PAYMENT_NOTIFICATION_REQUIRE_SECRET's secure-ON
    // default.
    if (response.data.status === 21007 && !useSandbox) {
      const allowSandbox = getConfig<string>('APPLE_ALLOW_SANDBOX_RECEIPTS', 'false') === 'true'
      if (!allowSandbox) {
        logger.warn('Rejecting Apple sandbox receipt (APPLE_ALLOW_SANDBOX_RECEIPTS is not enabled)')
        throw new Error('Sandbox receipts are not accepted.')
      }
      return verifyReceipt(receiptData, true)
    }

    return response.data
  } catch (error) {
    logger.error(`Error verifying Apple receipt:`, error)
    throw error
  }
}

/**
 * Extracts the subscription with the latest expiration date from a receipt verification response.
 * Checks both `latest_receipt_info` and `receipt.in_app` arrays.
 * @param response - The Apple receipt verification response.
 * @returns The in-app purchase entry with the latest `expires_date_ms`, or `null` if none found.
 */
export const getLatestSubscription = (response: VerifyReceiptResponse): InAppPurchase | null => {
  const subscriptions = response.latest_receipt_info || response.receipt?.in_app || []

  // Find the subscription with the latest expiration date
  return subscriptions.reduce<InAppPurchase | null>((latest, current) => {
    if (!current.expires_date_ms) return latest
    if (!latest) return current

    const currentExpires = parseInt(current.expires_date_ms, 10)
    const latestExpires = parseInt(latest.expires_date_ms || '0', 10)

    return currentExpires > latestExpires ? current : latest
  }, null)
}

/**
 * Checks whether an Apple subscription is currently active (not expired and not canceled).
 * @param subscription - The in-app purchase entry to check, or `null`.
 * @returns `true` if the subscription's `expires_date_ms` is in the future and it has not been canceled.
 */
export const isSubscriptionActive = (subscription: InAppPurchase | null): boolean => {
  if (!subscription || !subscription.expires_date_ms) return false
  if (subscription.cancellation_date) return false

  const expiresAt = parseInt(subscription.expires_date_ms, 10)
  return expiresAt > Date.now()
}

/**
 * Normalizes an Apple in-app purchase entry to the provider-agnostic `NormalizedSubscription` interface.
 * Maps Apple-specific fields (`expires_date_ms`, `is_trial_period`, `cancellation_date`) to standard status values.
 * @param subscription - The Apple in-app purchase entry to normalize.
 * @returns A `NormalizedSubscription` with provider set to `'apple'` and dates converted to millisecond timestamps.
 */
export const normalizeSubscription = (subscription: InAppPurchase): NormalizedSubscription => {
  const expiresAt = subscription.expires_date_ms ? parseInt(subscription.expires_date_ms, 10) : 0
  const isActive = expiresAt > Date.now() && !subscription.cancellation_date
  const isTrial = subscription.is_trial_period === 'true'

  return {
    provider: 'apple',
    subscriptionId: subscription.original_transaction_id,
    productId: subscription.product_id,
    status: subscription.cancellation_date
      ? 'canceled'
      : isActive
        ? isTrial
          ? 'trialing'
          : 'active'
        : 'expired',
    isActive,
    currentPeriodStart: parseInt(subscription.purchase_date_ms, 10),
    currentPeriodEnd: expiresAt,
    willRenew: isActive && !subscription.cancellation_date,
    canceledAt: subscription.cancellation_date_ms
      ? parseInt(subscription.cancellation_date_ms, 10)
      : undefined,
    rawData: subscription,
  }
}
