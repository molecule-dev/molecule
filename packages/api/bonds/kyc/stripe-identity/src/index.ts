/**
 * Stripe Identity KYC bond for molecule.dev.
 *
 * Implements the {@link KycProvider} contract from `@molecule/api-kyc` using
 * Stripe Identity's REST API. Verification sessions are document + selfie
 * (`document`), id-number (`id_number`), or hosted address checks
 * (provider-dependent). Webhooks are verified against
 * `STRIPE_IDENTITY_WEBHOOK_SECRET`.
 *
 * ## Setup
 *
 * 1. Create a Stripe account and enable Stripe Identity.
 * 2. Set `STRIPE_SECRET_KEY` and `STRIPE_IDENTITY_WEBHOOK_SECRET` in the
 *    API environment (or pass `secretKey` / `webhookSecret` to
 *    {@link createProvider}).
 * 3. Configure a webhook endpoint subscribed to
 *    `identity.verification_session.verified`,
 *    `identity.verification_session.requires_input`, and
 *    `identity.verification_session.canceled`.
 * 4. Bond at startup: `setProvider(provider)`.
 *
 * @example
 * ```typescript
 * import {
 *   createVerificationSession,
 *   type KycWebhookHeaders,
 *   processWebhook,
 *   setProvider,
 * } from '@molecule/api-kyc'
 * import { createProvider } from '@molecule/api-kyc-stripe-identity'
 *
 * // Startup (server only): bond once. Env: STRIPE_SECRET_KEY, STRIPE_IDENTITY_WEBHOOK_SECRET.
 * setProvider(
 *   createProvider({
 *     secretKey: process.env.STRIPE_SECRET_KEY,
 *     webhookSecret: process.env.STRIPE_IDENTITY_WEBHOOK_SECRET,
 *   }),
 * )
 *
 * // "Verify identity" handler: create a hosted session and redirect the user to `url`.
 * const session = await createVerificationSession({
 *   userId: 'user-123',
 *   type: 'document', // Stripe supports 'document' | 'id_number' only
 *   returnUrl: 'https://app.example.com/verify/done',
 * })
 * // { sessionId: 'vs_…', url: 'https://verify.stripe.com/…', expiresAt: <epoch ms> }
 *
 * // Webhook route — RAW body + headers verbatim; the ONLY source of truth for status.
 * const kycStatusByUser = new Map<string, string>() // your DB in a real app
 * async function handleStripeIdentityWebhook(headers: KycWebhookHeaders, rawBody: Buffer) {
 *   const event = await processWebhook(headers, rawBody) // throws on a bad signature → 400
 *   if (event.userId) kycStatusByUser.set(event.userId, event.type)
 *   return event.type // 'verification.verified' | 'verification.requires_input' | …
 * }
 * ```
 *
 * @remarks
 * - Bond with `setProvider(...)` from `@molecule/api-kyc` and call the core's
 *   `createVerificationSession` / `getVerificationStatus` / `processWebhook` —
 *   not `bond('kyc-stripe-identity', ...)`. The `provider` export is a lazy
 *   default that reads the two env vars on first use.
 * - Missing `STRIPE_SECRET_KEY` / `STRIPE_IDENTITY_WEBHOOK_SECRET` throws at CALL
 *   time (not at startup). Use the Identity-specific webhook signing secret
 *   (`whsec_…` of the endpoint subscribed to `identity.verification_session.*`),
 *   not the payments webhook's secret.
 * - `processWebhook` needs the RAW body (Buffer/string exactly as received) and
 *   the `stripe-signature` header; a re-serialized JSON body fails verification.
 *   Signatures older than 300 s are rejected (`webhookToleranceSeconds`). Any
 *   event type other than `verified` / `requires_input` / `canceled` THROWS —
 *   subscribe only to those three (or catch and 2xx the rest).
 * - `event.userId` is the `userId` you passed at creation (stored as Stripe
 *   metadata `molecule_user_id`). `type: 'address'` is forwarded but Stripe
 *   rejects it. No `stripe` SDK is used — plain `fetch`, API version `2024-06-20`.
 * - Errors are sanitized (`Stripe Identity createSession failed status=400
 *   code=…`) — Stripe's response body is never included.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { KycProvider } from '@molecule/api-kyc'

import { createProvider } from './provider.js'

let _provider: KycProvider | null = null

/**
 * The Stripe Identity provider. Lazily initialized on first use so that
 * environment variables are read at call time rather than import time.
 */
export const provider: KycProvider = new Proxy({} as KycProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
