/**
 * Stripe Identity bond types.
 *
 * Re-exports the normalized contract from `@molecule/api-kyc` and declares
 * the env-var shape consumed by {@link createProvider}.
 *
 * @module
 */

export type {
  CreateKycSessionOptions,
  KycProvider,
  KycSession,
  KycSessionStatus,
  KycStatus,
  KycVerificationType,
  KycWebhookEvent,
  KycWebhookEventType,
  KycWebhookHeaders,
} from '@molecule/api-kyc'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * Stripe secret API key (`sk_live_...` or `sk_test_...`). Required.
       *
       * @see https://stripe.com/docs/keys
       */
      STRIPE_SECRET_KEY?: string

      /**
       * Stripe Identity webhook signing secret (`whsec_...`). Required to
       * verify inbound webhook events.
       *
       * @see https://stripe.com/docs/webhooks/signatures
       */
      STRIPE_IDENTITY_WEBHOOK_SECRET?: string
    }
  }
}

/**
 * Configuration options for {@link createProvider}.
 *
 * Every field defaults to environment variables so handlers can call
 * `createProvider()` with no arguments. Tests inject overrides
 * (especially {@link StripeIdentityProviderOptions.fetch} and
 * {@link StripeIdentityProviderOptions.apiBaseUrl}).
 */
export interface StripeIdentityProviderOptions {
  /**
   * Stripe secret API key. Defaults to `process.env.STRIPE_SECRET_KEY`.
   */
  secretKey?: string
  /**
   * Stripe Identity webhook signing secret. Defaults to
   * `process.env.STRIPE_IDENTITY_WEBHOOK_SECRET`.
   */
  webhookSecret?: string
  /**
   * Override the Stripe API base URL. Defaults to `https://api.stripe.com`.
   * Useful for tests pointing at a fake Stripe server.
   */
  apiBaseUrl?: string
  /** Request timeout in milliseconds. Defaults to `15_000`. */
  timeoutMs?: number
  /**
   * Override the Stripe API version sent on every request. Defaults to
   * Stripe's pinned `2024-06-20`.
   */
  apiVersion?: string
  /**
   * Maximum allowed clock-drift between the bond's host and Stripe when
   * verifying webhook signatures, in seconds. Defaults to `300` (5 minutes),
   * matching Stripe's recommendation.
   */
  webhookToleranceSeconds?: number
  /**
   * Replace the global fetch implementation. Tests inject a stub here;
   * production callers should leave it unset.
   */
  fetch?: typeof fetch
}
