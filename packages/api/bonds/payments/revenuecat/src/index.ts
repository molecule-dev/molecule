/**
 * RevenueCat payment provider for molecule.dev.
 *
 * Verifies a customer's in-app-purchase entitlements against RevenueCat's v1
 * REST API and parses RevenueCat's webhooks — one bond for App Store, Google
 * Play, Amazon, Stripe, Paddle, Roku and RevenueCat Billing purchases, because
 * RevenueCat has already normalized them.
 *
 * REST over the runtime's global `fetch` — no vendor SDK, no HTTP dependency.
 *
 * @see https://www.revenuecat.com/docs/api-v1
 *
 * @example
 * ```ts
 * import { bond } from '@molecule/api-bond'
 * import { paymentProvider } from '@molecule/api-payments-revenuecat'
 *
 * bond('payments', paymentProvider)
 * ```
 *
 * @remarks
 * Facts to know BEFORE wiring this bond:
 *
 * - **The App User ID is an IDENTIFIER, not a proof of purchase.** Apple and
 *   Google receipt bonds verify a cryptographic artifact only the buyer's
 *   device holds; RevenueCat's `verifyReceipt(appUserId, productId)` just asks
 *   "what does this customer own?". So anyone who learns another customer's App
 *   User ID could claim their plan. Set the RevenueCat App User ID to your
 *   OWN authenticated user id (`Purchases.logIn(user.id)` in the client SDK)
 *   and have the verify route submit the id of the user it already
 *   authenticated — never an arbitrary value from the request body. Anonymous
 *   RevenueCat ids (`$RCAnonymousID:…`) must not be accepted.
 * - **Customers are keyed by `original_app_user_id`, not by the id you sent.**
 *   RevenueCat aliases App User IDs (anonymous → logged-in, merges), and a
 *   webhook's `app_user_id` is only the LAST SEEN one. Both `verifyReceipt` and
 *   `handleWebhookEvent` therefore report the customer's FIRST id as
 *   `customerId`, so the payment record written at verify time is the one the
 *   webhook finds later. If you look customers up yourself, search the
 *   `aliases` array too.
 * - **`REVENUECAT_SECRET_API_KEY` is the SECRET (v1) key, not the public SDK
 *   key.** The public key ships inside your app and can only read; the secret
 *   key is server-only. Both start with different prefixes in the dashboard —
 *   Project settings → API keys → "Secret API keys".
 * - **Sandbox purchases are rejected by default (fail-closed).** A store-sandbox
 *   purchase costs nothing, so accepting one grants a real plan for free.
 *   Set `REVENUECAT_ALLOW_SANDBOX=true` for local/CI testing only. This is NOT
 *   gated on `NODE_ENV`, which fails open whenever a deploy forgets to set it.
 * - **Webhook authentication is fail-closed and there is no default.**
 *   RevenueCat sends webhooks with a shared `Authorization` header value and/or
 *   an HMAC-SHA256 `X-RevenueCat-Webhook-Signature`, both opt-in in the
 *   dashboard. With NEITHER `REVENUECAT_WEBHOOK_AUTHORIZATION` nor
 *   `REVENUECAT_WEBHOOK_SIGNING_SECRET` set, `handleWebhookEvent` throws a
 *   tagged config-not-configured error rather than accepting a plan grant from
 *   an unauthenticated POST. Whichever ones ARE set must all pass.
 * - **The HMAC covers the RAW request bytes.** `JSON.parse` → `JSON.stringify`
 *   changes them and fails verification on valid requests, so the route must
 *   expose `req.rawBody` (`express.raw()`, or the `verify` hook of
 *   `express.json()`). `handleWebhookEvent` prefers `rawBody` and falls back to
 *   re-serializing `body`, which only works when no signing secret is set.
 * - **A RevenueCat `CANCELLATION` is usually NOT a revocation.** It fires when a
 *   customer turns auto-renew off — they keep access until `expiration_at_ms` —
 *   and also when a purchase is refunded. Only a refund (`cancel_reason` of
 *   `CUSTOMER_SUPPORT`) maps to a revoking event type here; the rest map to
 *   `unsubscribed`, which leaves the plan in place and reports
 *   `autoRenews: false`. Revoke on `EXPIRATION`, never on every `CANCELLATION`.
 *   Likewise `SUBSCRIPTION_PAUSED` and `BILLING_ISSUE` do not end access.
 * - **Register plans under either identifier.** `verifyReceipt`'s `productId`
 *   accepts a RevenueCat entitlement identifier (`pro`) or a store product
 *   identifier (`com.example.pro.monthly`), and results carry the store product
 *   id as `productId` and the entitlement id as `priceId` so the payments
 *   core's "try `productId`, then `priceId`" plan resolution finds either.
 * - **`store_transaction_id` is a NUMBER for App Store purchases** and a string
 *   everywhere else. Use `getStoreTransactionId()` rather than reading the raw
 *   field, or an iOS customer's id silently fails a `===` against a stored one.
 * - **This bond verifies; it does not sell.** RevenueCat purchases happen in the
 *   store or the client SDK, so there is no server-created checkout session, no
 *   billing portal, and no `updateSubscription`/`cancelSubscription` — send the
 *   customer to `subscriber.management_url` from their customer info to manage
 *   or cancel. One-time (non-subscription) purchases are likewise out of scope:
 *   an entitlement backed by a `non_subscriptions` purchase verifies as no
 *   subscription.
 * - **A missing `REVENUECAT_SECRET_API_KEY` throws a tagged config error BEFORE
 *   any network call** (`isConfigNotConfiguredError` from
 *   `@molecule/api-payments`), and `verifyReceipt` rethrows it rather than
 *   swallowing it into the same `null` an unentitled customer returns. Every
 *   other RevenueCat failure surfaces as {@link RevenueCatApiError}, which
 *   carries the vendor `status` and `code` but is deliberately NOT tagged, so
 *   the API answers its own generic error instead of echoing RevenueCat's.
 * - **Point the base URL somewhere else with `REVENUECAT_BASE_URL`** (a broker,
 *   a compatible endpoint, a test double). It must include the version segment;
 *   the default is `https://api.revenuecat.com/v1`.
 *
 * @module
 */

export * from './bondAdapter.js'
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './signature.js'
export * from './types.js'
export * from './webhook.js'
