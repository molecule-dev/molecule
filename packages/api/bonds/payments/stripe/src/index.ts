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
 * **You do NOT need molecule's Express app, the `bond()` wiring, or the UI packages to use
 * this — the functions below are framework-agnostic.** On a non-Express / non-molecule host
 * (Next.js App Router, serverless functions, Hono, Fastify), import them and call them from
 * your OWN route handlers:
 * `import { createCheckoutSession, verifyWebhookSignature, getSubscription } from '@molecule/api-payments-stripe'`.
 * They cover the whole flow — {@link createCheckoutSession} (server-owned `priceId`, so you
 * never take a price/amount from the client), {@link verifyWebhookSignature}, and the
 * subscription getters/updaters — and carry the security contract (config-not-configured
 * errors, normalized status) for free, so reach for these instead of hand-rolling raw
 * `stripe` calls. In a Next.js App Router route, read the RAW webhook body with
 * `await req.text()` and the header with `req.headers.get('stripe-signature')`, then
 * `verifyWebhookSignature(rawBody, signature)` (the `express.raw(...)` note below is the
 * Express-host equivalent). Only `@molecule/api-middleware-billing-routes` (Express glue) and
 * `@molecule/app-billing-react` (molecule UI) are framework-coupled — skip THOSE on such a
 * host, but still use these bond functions underneath.
 *
 * Two things a weak Stripe integration gets wrong:
 *
 * - **The webhook body MUST be RAW for signature verification.** {@link verifyWebhookSignature}
 *   (Stripe's `constructEvent`) hashes the exact bytes, so a parsed-then-re-serialized body
 *   ALWAYS fails. In a molecule app you need NO special middleware: the always-included
 *   `@molecule/api-middleware-body-parser-express` already captures the unparsed body as
 *   `req.rawBody` (a string) on EVERY request — just pass `req.rawBody` + the `stripe-signature`
 *   header to {@link verifyWebhookSignature}. Do NOT add a route-specific `express.raw(...)` here —
 *   it is redundant and fights the global JSON parser (which has already consumed the stream and
 *   set `req.rawBody`). (ONLY on a NON-molecule Express host that lacks `req.rawBody` do you mount
 *   `express.raw({ type: 'application/json' })` before the JSON parser; on Next.js App Router read
 *   the raw body with `await req.text()`.) NEVER act on an unverified webhook body — it is
 *   attacker-controlled.
 * - **Webhooks are redelivered — be idempotent.** Stripe retries until it gets a 2xx, so the
 *   same `event.id` can arrive twice. Dedupe on it (the payment record's
 *   `UNIQUE(platformKey, transactionId)` already blocks a double-grant), and return 2xx once
 *   handled so Stripe stops retrying.
 *
 * Create checkout with SERVER-configured price ids ({@link createCheckoutSession}) — never an
 * amount sent by the client.
 *
 * **A missing `STRIPE_SECRET_KEY` is NOT the same as "no active subscription."**
 * `getClient()` throws a tagged config-not-configured error; `verifySubscription`,
 * `updateSubscription`, and `cancelSubscription` on {@link paymentProvider} detect
 * that tag (`isConfigNotConfiguredError` from `@molecule/api-payments`) and
 * RETHROW it instead of swallowing it into the same `null` / `{ updated: false }`
 * / `false` a genuine verification/update failure returns — so a caller (or its
 * own catch block) can tell "the operator forgot to set the secret" apart from
 * "this subscription/card is invalid" and surface the actionable 503 instead of
 * a generic 400/500.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './bondAdapter.js'
export * from './connect.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
