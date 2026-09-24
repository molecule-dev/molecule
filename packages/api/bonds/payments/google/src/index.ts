/**
 * Google Play In-App Purchase provider for molecule.dev.
 *
 * Handles verification of Google Play purchases and subscriptions.
 *
 * @see https://developer.android.com/google/play/billing
 *
 * @example
 * ```typescript
 * import { bond, get } from '@molecule/api-bond'
 * import type { PaymentProviderInterface } from '@molecule/api-payments'
 * import { paymentProvider } from '@molecule/api-payments-google'
 *
 * // Startup: NAMED bond. Env (server only): GOOGLE_PLAY_PACKAGE_NAME (e.g. com.example.app) and
 * // GOOGLE_API_SERVICE_KEY_OBJECT (the service-account key JSON, as ONE string).
 * bond('payments', 'google', paymentProvider)
 *
 * // Verify route: the Android client sends the purchase token from Play Billing's Purchase.
 * const purchaseToken = 'purchase-token-from-play-billing'
 * const google = get<PaymentProviderInterface>('payments', 'google')
 * const verified = await google?.verifyPurchase?.(purchaseToken, 'pro_monthly') // (token, subscription id)
 * // { productId: 'pro_monthly', transactionId: 'GPA.…', expiresAt: ISO, autoRenews } — and acknowledged
 * // null → wrong product / pending / on hold / revoked / expired / bad token (grant nothing)
 * console.log(verified?.transactionId, verified?.expiresAt)
 * ```
 *
 * @remarks
 * - **Bond it NAMED — `bond('payments', 'google', paymentProvider)`** — and call
 *   `verifyPurchase(purchaseToken, productId)`: TOKEN FIRST. There is no
 *   `verifySubscription` on the adapter (the exported `verifySubscription`
 *   function is the raw Play API call and THROWS instead of returning `null`).
 * - `verifyPurchase` checks SUBSCRIPTIONS only (`purchases.subscriptionsv2`);
 *   one-time products need `verifyProduct` + `acknowledgeProduct`. On success
 *   it acknowledges the purchase for you — Google auto-refunds purchases left
 *   unacknowledged for 3 days.
 * - The service account must be granted access in Play Console (Users and
 *   permissions → financial data / manage orders), or every call fails 401/403
 *   and `verifyPurchase` returns `null`.
 *
 * **`parseNotification` handles all three RTDN kinds** — `subscriptionNotification`
 * (the primary flow: verified via `purchases.subscriptionsv2.get`, mapped to
 * `renewed`/`canceled`/`expired`/etc.), `oneTimeProductNotification` (verified via
 * `purchases.products.get`, mapped to `purchased`/`canceled` — no `expiresAt` is
 * ever set, since a one-time purchase doesn't expire; a generic subscription-plan
 * handler correctly no-ops on `'purchased'`, so apps selling one-time products
 * must handle that `type` explicitly), and `voidedPurchaseNotification` (a
 * refund/chargeback for EITHER kind — mapped to `refund`; NOT re-verified against
 * Google's API, since the payload carries no product id to verify against, only
 * used to look up an EXISTING payment record by `transactionId`/`orderId` and
 * revoke it, so a forged one can only no-op, never grant). `testNotification`
 * (Play Console's "Send test notification") logs at `info` and returns `null`.
 *
 * **A missing `GOOGLE_API_SERVICE_KEY_OBJECT`/`GOOGLE_PLAY_PACKAGE_NAME` is NOT
 * the same as "invalid purchase."** Both throw a tagged config-not-configured
 * error; `verifyPurchase` on {@link paymentProvider} detects that tag
 * (`isConfigNotConfiguredError` from `@molecule/api-payments`) and RETHROWS it
 * instead of swallowing it into the same `null` a genuine bad-token verification
 * returns — so a caller can tell "the operator forgot to set the secret" apart
 * from "this purchase isn't valid" and surface the actionable 503.
 *
 * @module
 */

export * from './bondAdapter.js'
export * from './browser-guard.js'
export * from './secrets.js'
export * from './types.js'
export * from './verification.js'
