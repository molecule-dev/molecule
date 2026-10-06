/**
 * Payments capture provider for molecule.dev — a payments vendor simulated in
 * memory, for dev, in-browser and offline environments.
 *
 * It implements the whole `PaymentProviderInterface` from
 * `@molecule/api-payments` without a single network call: a checkout
 * completes, a subscription activates, renews, fails a renewal, cancels, a
 * refund is recorded, and a signed webhook can be built and delivered to the
 * app's own webhook route. Production bonds `@molecule/api-payments-stripe`
 * in its place, and the app code does not change.
 *
 * @remarks
 * - **Dev only — it grants plans without taking money.** Bond it only in
 *   the dev / browser / offline profile. Every id it issues carries a
 *   `_capture_` infix (`cus_capture_000001`, `sub_capture_000001`,
 *   `cs_capture_000001`) so a simulated record is recognisable wherever it ends
 *   up; the leading vendor prefix (`cs_`, `sub_`) is kept so app code that
 *   branches on it behaves as it does against Stripe.
 * - **It answers to the name `'stripe'` by default**, so it can be bonded under
 *   the name production uses: `bond('payments', 'stripe', provider)`. The
 *   app's verify route (`/users/:id/verify-payment/stripe`), the plan
 *   catalogue's `platformKey` and the frontend's provider name stay the same.
 *   Pass `createPaymentsCaptureProvider({ providerName: 'capture' })` to bond
 *   it under its own name instead.
 * - **Checkout has no hosted payment page.** `updateSubscription` for a user
 *   with no live subscription creates a checkout session and returns, as
 *   `checkoutUrl`, the app's own return URL
 *   (`APP_ORIGIN/plan-updated?provider=stripe&sessionId=cs_capture_…`, from
 *   `resolveCheckoutRedirectUrls`). By default the session is completed as
 *   paid at once, so the return page's verify call finds an active
 *   subscription. Pass `autoCompleteCheckout: false` to drive it yourself with
 *   `provider.completeCheckout(sessionId, { outcome: 'paid' | 'declined' })` —
 *   until then `verifySubscription` returns `null`, as it would for an unpaid
 *   session.
 * - **Behaviour mirrors the Stripe bond**, including its refusals:
 *   `verifySubscription` accepts a `cs_` or `sub_` id and returns `null` unless
 *   the subscription is active/trialing with an unelapsed period;
 *   `updateSubscription` changes the plan in place for a paid-up subscription,
 *   refuses (`{ updated: false }`) one that is past due, and starts a new
 *   checkout otherwise; `cancelSubscription` cancels at period end.
 * - **Refused, not faked:** `verifyReceipt`, `verifyPurchase` and
 *   `parseNotification` reject with a `PaymentsCaptureError` (`errorKey`
 *   `'payments.capture.unsupported'`, `statusCode` 501). App Store and Play
 *   receipts and their store notifications are signed by Apple and Google and
 *   cannot be produced or checked offline; this provider simulates a
 *   hosted-checkout vendor (`verifyFlow: 'subscription'`,
 *   `notificationFlow: 'webhook'`).
 * - **No hosted billing portal either.** `createPortalSession` returns the
 *   return URL itself (and `null` for a user with no customer), so the round
 *   trip lands straight back in the app. Cancel with `cancelSubscription` or
 *   the ledger helpers.
 * - **Webhooks use Stripe's signature scheme and event shape.** The secret is
 *   `options.webhookSecret`, else `PAYMENTS_CAPTURE_WEBHOOK_SECRET`, else the
 *   built-in `whsec_capture_dev_secret`. `provider.buildWebhookRequest()`
 *   returns `{ rawBody, headers }` — POST those exact bytes to the app's
 *   webhook route (`/users/payment-notification/stripe`), where
 *   `handleWebhookEvent` verifies and parses them. Because the scheme is
 *   Stripe's, the same request also passes the real Stripe bond when its
 *   `STRIPE_WEBHOOK_SECRET` is set to the dev secret. Re-serializing the body
 *   breaks the signature, exactly as it does with Stripe.
 * - **Webhooks are not sent on their own.** A ledger change (completing a
 *   checkout, `failRenewal`, `refund`) does not deliver an event; build one
 *   with `buildWebhookRequest` and send it when the test wants it. Read
 *   `webhookDeliveries` in the ledger to see what the handler accepted.
 * - **The ledger is in memory and per process.** `getCapturedPayments()`
 *   returns a deep copy of everything (customers, checkout sessions,
 *   subscriptions, SetupIntents, cards, refunds, portal sessions, built and
 *   received webhooks, and every interface call); `clearCapturedPayments()`
 *   empties it and restarts the id sequence. A restart loses it. For isolated
 *   tests pass `ledger: new PaymentsCaptureLedger()`.
 * - **Saved cards:** `createSetupIntent` creates a customer when none is given;
 *   there is no card form, so confirm the SetupIntent with
 *   `provider.confirmSetupIntent(id, { brand, last4 })`, then send the
 *   returned `pm_capture_…` id to your API as the card form would.
 * - Nothing here is recorded to `@molecule/api-activity`: the ledger is the
 *   inspection surface.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider } from '@molecule/api-payments-capture'
 *
 * // api/src/bonds/payments.ts — dev profile. Production bonds
 * // `paymentProvider` from '@molecule/api-payments-stripe' on the same line.
 * bond('payments', 'stripe', provider)
 * ```
 *
 * @example
 * ```typescript
 * // e2e: subscribe, then drive a failed renewal through the app's webhook route.
 * import {
 *   createPaymentsCaptureProvider,
 *   PaymentsCaptureLedger,
 * } from '@molecule/api-payments-capture'
 *
 * const payments = createPaymentsCaptureProvider({ ledger: new PaymentsCaptureLedger() })
 * const result = await payments.updateSubscription({ userId: 'u1', newProductId: 'price_pro' })
 * // result.checkoutUrl → the app's /plan-updated page with sessionId=cs_capture_000001
 *
 * const sub = payments.getCaptured().subscriptions[0]
 * payments.failRenewal(sub.id)
 * const request = payments.buildWebhookRequest({
 *   type: 'customer.subscription.updated',
 *   subscriptionId: sub.id,
 * })
 * await fetch(`${apiOrigin}/users/payment-notification/stripe`, {
 *   method: 'POST',
 *   headers: request.headers,
 *   body: request.rawBody,
 * })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './ledger.js'
export * from './provider.js'
export * from './types.js'
export * from './webhook.js'
