/**
 * PayPal payment provider for molecule.dev.
 *
 * Bond this as the payments provider so `@molecule/api-payments`'s `verifySubscription` (and
 * the payment resource) work server-side with PayPal — don't hand-roll `fetch` calls to
 * PayPal for verification. Env: `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` are SERVER-ONLY;
 * `PAYPAL_BASE_URL` defaults to the sandbox host, `PAYPAL_WEBHOOK_ID` is required only for
 * webhook handling.
 *
 * @example
 * ```ts
 * import { bond } from '@molecule/api-bond'
 * import { paymentProvider } from '@molecule/api-payments-paypal'
 *
 * // Named bond, mirroring the stripe convention: bond('payments', '<name>', provider).
 * bond('payments', 'paypal', paymentProvider)
 * ```
 *
 * @remarks
 * **You do NOT need molecule's Express app, the `bond()` wiring, or the UI packages to use
 * this — the functions below are framework-agnostic.** On a non-Express / non-molecule host
 * (Next.js App Router, serverless functions, Hono, Fastify), import them and call them from
 * your OWN route handlers:
 * `import { createSubscription, verifyWebhookSignature, getSubscription } from '@molecule/api-payments-paypal'`.
 * They cover the whole flow — {@link createSubscription} / {@link createOrder} (server-owned
 * plan/amount, so you never take a price from the client), {@link verifyWebhookSignature},
 * and the subscription/order getters — and carry the security contract (config-not-configured
 * errors, normalized status) for free, so reach for these instead of hand-rolling raw PayPal
 * calls.
 *
 * PayPal-specific things a weak integration gets wrong:
 *
 * - **A billing plan must EXIST before a subscription can be created.** Subscriptions are
 *   started with a plan id (`P-...`) — create the plan first (PayPal Developer Dashboard →
 *   your app → Subscriptions, or {@link createProduct} + {@link createPlan} from code) and
 *   configure your app's plan catalogue with the `P-...` ids. Creating a subscription for a
 *   nonexistent plan fails with `RESOURCE_NOT_FOUND`.
 * - **Sandbox and live are different hosts AND different credentials.** The bond defaults to
 *   the sandbox (`https://api-m.sandbox.paypal.com`); set `PAYPAL_BASE_URL=https://api-m.paypal.com`
 *   for live. The client id/secret must come from the SAME environment tab (Sandbox/Live) in
 *   the developer dashboard — a sandbox secret against the live host fails OAuth with a 401.
 * - **Webhook verification is a SERVER CALL, not a local HMAC.** {@link verifyWebhookSignature}
 *   posts the transmission headers + event + your `PAYPAL_WEBHOOK_ID` back to PayPal's
 *   `/v1/notifications/verify-webhook-signature`, which answers `SUCCESS`/`FAILURE`. Register
 *   your webhook in the dashboard pointing at `{apiUrl}/api/users/payment-notification/paypal`
 *   and copy its webhook id into `PAYPAL_WEBHOOK_ID`. NEVER act on an unverified webhook body
 *   — it is attacker-controlled. Redeliveries happen — be idempotent and return 2xx once handled.
 * - **After buyer approval PayPal appends its OWN query params to your `return_url`** —
 *   `?subscription_id=I-...&ba_token=...&token=...` for subscriptions and `?token=<orderId>&PayerID=...`
 *   for orders — so read `subscription_id`/`token`, not just a `subscriptionId` you may have
 *   expected. (The molecule user resource's verify-payment handler accepts all three.)
 * - **A subscription is only entitled when `ACTIVE`.** `APPROVAL_PENDING`/`APPROVED` mean the
 *   buyer approved the billing agreement but no payment is confirmed yet — granting there
 *   confers entitlement without payment. After approval PayPal flips the subscription to
 *   `ACTIVE` within seconds; have the frontend retry verification briefly rather than
 *   lowering the gate.
 * - **Cancellation is IMMEDIATE.** PayPal has no `cancel_at_period_end`:
 *   `cancelSubscription` terminates the subscription at once and does not refund the unused
 *   remainder of the cycle automatically.
 * - **One-time orders are captured on verify.** `verifySubscription(orderId)` captures an
 *   `APPROVED` order and only grants on `COMPLETED`; a `CREATED` order was never
 *   buyer-approved and always fails verification.
 *
 * **A missing `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` is NOT the same as "no active
 * subscription."** `getAccessToken()` throws a tagged config-not-configured error;
 * `verifySubscription`, `updateSubscription`, and `cancelSubscription` on
 * {@link paymentProvider} detect that tag (`isConfigNotConfiguredError` from
 * `@molecule/api-payments`) and RETHROW it instead of swallowing it into the same
 * `null` / `{ updated: false }` / `false` a genuine verification/update failure returns —
 * so a caller can tell "the operator forgot to set the secret" apart from "this
 * subscription is invalid" and surface the actionable 503 instead of a generic 400/500.
 *
 * @module
 */

export * from './bondAdapter.js'
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
