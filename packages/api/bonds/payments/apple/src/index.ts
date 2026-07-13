/**
 * Apple In-App Purchase provider for molecule.dev.
 *
 * Handles verification of Apple App Store receipts for in-app purchases and subscriptions.
 *
 * @see https://developer.apple.com/documentation/storekit/in-app_purchase
 *
 * @remarks
 * Scope limits to know BEFORE wiring this bond:
 *
 * - **Subscriptions only.** Verification looks for the latest entry with an
 *   `expires_date_ms`, so a valid ONE-TIME (consumable/non-consumable) purchase
 *   receipt verifies with Apple but yields `null` ("no subscription found") —
 *   one-time IAP is not implemented.
 * - **v1 server notifications only.** `parseNotification` authenticates v1
 *   notifications by re-verifying the embedded receipt with Apple. v2
 *   (`signedPayload` JWS) notifications are REJECTED (`null`) — App Store
 *   Connect must be configured to send v1 notifications, or entitlement
 *   updates will only happen on client-driven verification.
 * - Verification uses Apple's legacy `verifyReceipt` endpoint with
 *   `APPLE_SHARED_SECRET`. Non-zero Apple statuses are logged with their
 *   meaning (see `describeAppleStatus`) — status 21004 means the shared secret
 *   is missing/wrong (an env fix, not a client bug).
 * - Sandbox receipts are rejected by default (fail-closed); opt in with
 *   `APPLE_ALLOW_SANDBOX_RECEIPTS=true` for local/CI testing only.
 *
 * @module
 */

export * from './bondAdapter.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
