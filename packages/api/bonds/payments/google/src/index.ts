/**
 * Google Play In-App Purchase provider for molecule.dev.
 *
 * Handles verification of Google Play purchases and subscriptions.
 *
 * @see https://developer.android.com/google/play/billing
 *
 * @remarks
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

export * from './browser-guard.js'
export * from './bondAdapter.js'
export * from './secrets.js'
export * from './types.js'
export * from './verification.js'
