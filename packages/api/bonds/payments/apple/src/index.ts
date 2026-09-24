/**
 * Apple In-App Purchase provider for molecule.dev.
 *
 * Handles verification of Apple App Store receipts for in-app purchases and subscriptions.
 *
 * @see https://developer.apple.com/documentation/storekit/in-app_purchase
 *
 * @example
 * ```typescript
 * import { bond, get } from '@molecule/api-bond'
 * import { setProvider as setConfigProvider } from '@molecule/api-config'
 * import { provider as envConfig } from '@molecule/api-config-env'
 * import type { PaymentProviderInterface } from '@molecule/api-payments'
 * import { paymentProvider } from '@molecule/api-payments-apple'
 *
 * // Startup: NAMED bond. Env (server only): APPLE_SHARED_SECRET (App Store Connect →
 * // App-Specific Shared Secret). The sandbox check reads APPLE_ALLOW_SANDBOX_RECEIPTS through
 * // `@molecule/api-config`, so bond a config provider too.
 * setConfigProvider(envConfig)
 * bond('payments', 'apple', paymentProvider)
 *
 * // Verify route: the iOS client sends the base64 app receipt + the product it bought.
 * const receiptData = 'MIIT…base64-app-receipt'
 * const apple = get<PaymentProviderInterface>('payments', 'apple')
 * const verified = await apple?.verifyReceipt?.(receiptData, 'com.example.pro.monthly')
 * // { productId, transactionId: original_transaction_id, expiresAt: ISO, autoRenews }
 * // null → bad receipt / product mismatch / refunded / expired / not a subscription
 * console.log(verified?.transactionId, verified?.expiresAt)
 * ```
 *
 * @remarks
 * Scope limits to know BEFORE wiring this bond:
 *
 * - **Bond it NAMED — `bond('payments', 'apple', paymentProvider)`** — and
 *   call `verifyReceipt(receipt, productId)` (RECEIPT first). The adapter has
 *   no `verifySubscription`/`verifyPurchase`. `transactionId` is the
 *   `original_transaction_id` (stable across renewals) — store and dedupe on it.
 * - **Without a bonded `@molecule/api-config` provider a SANDBOX receipt
 *   (Apple status 21007) cannot be evaluated** — the lookup throws and
 *   `verifyReceipt` returns `null`. Production receipts never read config.
 *
 * - **Subscriptions only.** Verification looks for the latest entry with an
 *   `expires_date_ms`, so a valid ONE-TIME (consumable/non-consumable) purchase
 *   receipt verifies with Apple but yields `null` ("no subscription found") —
 *   one-time IAP is not implemented.
 * - **Both v1 and v2 server notifications are supported.** `parseNotification`
 *   authenticates v1 notifications (`notification_type` at the body root) by
 *   re-verifying the embedded receipt with Apple; it authenticates v2
 *   notifications (`signedPayload` JWS, no top-level `notification_type`) by
 *   cryptographically verifying the JWS `x5c` certificate chain against
 *   Apple's Root CA - G3 (see `jws.ts` / `appleRootCertificate.ts`) — NO live
 *   call back to Apple, which is Apple's own documented model for v2 (the
 *   signature chain IS the proof). App Store Connect defaults NEW apps to v2;
 *   both are handled the same way downstream (mapped to the same simplified
 *   event vocabulary), so no notification-version configuration is required.
 * - Verification uses Apple's legacy `verifyReceipt` endpoint with
 *   `APPLE_SHARED_SECRET` for the CLIENT-DRIVEN verify flow
 *   (`verifyReceipt`/`verifyPayment`) — this is unrelated to which
 *   notification version App Store Connect sends. Non-zero Apple statuses are
 *   logged with their meaning (see `describeAppleStatus`) — status 21004
 *   means the shared secret is missing/wrong (an env fix, not a client bug).
 *   A missing `APPLE_SHARED_SECRET` throws a tagged config-not-configured
 *   error (`isConfigNotConfiguredError` from `@molecule/api-payments`) BEFORE
 *   any network call, and `verifyReceipt` on {@link paymentProvider} rethrows
 *   it rather than swallowing it into the same `null` a genuinely bad receipt
 *   returns.
 * - Sandbox receipts are rejected by default (fail-closed); opt in with
 *   `APPLE_ALLOW_SANDBOX_RECEIPTS=true` for local/CI testing only.
 * - `normalizeSubscription()`'s `willRenew` is INFERRED (`isActive &&
 *   !cancellation_date`) unless you pass the receipt response as its second
 *   argument, in which case it reads the ACTUAL auto-renew flag from
 *   `pending_renewal_info` — a still-active subscriber who turned auto-renew
 *   OFF mid-period has no `cancellation_date` yet, so the inferred value
 *   alone reports `willRenew: true` right up until expiry.
 *
 * @module
 */

export * from './appleRootCertificate.js'
export * from './bondAdapter.js'
export * from './browser-guard.js'
export * from './jws.js'
export * from './notificationV2.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
