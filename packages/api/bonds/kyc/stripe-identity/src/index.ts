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
 * import { setProvider } from '@molecule/api-kyc'
 * import { provider } from '@molecule/api-kyc-stripe-identity'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

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
