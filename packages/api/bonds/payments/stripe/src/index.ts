/**
 * Stripe payment provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/stripe
 *
 * @remarks
 * Bond this as the payments provider so `@molecule/api-payments`'s `verifySubscription` (and
 * the payment resource) work server-side — don't call the Stripe SDK directly for
 * verification. Env: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` are SERVER-ONLY; only the
 * publishable key (`pk_…`) is client-side.
 *
 * Two things a weak Stripe integration gets wrong:
 *
 * - **The webhook body MUST be RAW for signature verification.** {@link verifyWebhookSignature}
 *   (Stripe's `constructEvent`) hashes the exact bytes, so if `express.json()` already parsed
 *   the request, verification ALWAYS fails. Mount the notification route with
 *   `express.raw({ type: 'application/json' })` (or capture `req.rawBody`) BEFORE the JSON body
 *   parser, and pass that raw Buffer/string + the `stripe-signature` header. NEVER act on an
 *   unverified webhook body — it is attacker-controlled.
 * - **Webhooks are redelivered — be idempotent.** Stripe retries until it gets a 2xx, so the
 *   same `event.id` can arrive twice. Dedupe on it (the payment record's
 *   `UNIQUE(platformKey, transactionId)` already blocks a double-grant), and return 2xx once
 *   handled so Stripe stops retrying.
 *
 * Create checkout with SERVER-configured price ids ({@link createCheckoutSession}) — never an
 * amount sent by the client.
 *
 * @module
 */

export * from './bondAdapter.js'
export * from './connect.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
