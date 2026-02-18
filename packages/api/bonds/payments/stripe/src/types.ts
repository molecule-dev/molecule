/**
 * Type definitions for the Stripe payment provider.
 *
 * @module
 */

export type {
  NormalizedPurchase,
  NormalizedSubscription,
  PaymentProvider,
  SubscriptionStatus,
} from '@molecule/api-payments'

/**
 * Result of creating a checkout session.
 */
export interface CheckoutSessionResult {
  id: string
  url: string | null
}

/**
 * Normalized subscription data from Stripe.
 */
export interface SubscriptionResult {
  id: string
  status: string
  items: { data: Array<{ id: string; price?: { product?: string } }> }
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
}

/**
 * Parameters for updating a subscription.
 */
export interface SubscriptionUpdateParams {
  items?: Array<{ id: string; price: string }>
  cancel_at_period_end?: boolean
}

/**
 * Result of verifying a webhook event.
 */
export interface WebhookEventResult {
  type: string
  data: { object: Record<string, unknown> }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The key used for Stripe's API.
       */
      STRIPE_SECRET_KEY?: string

      /**
       * The Stripe webhook secret for verifying webhook signatures.
       */
      STRIPE_WEBHOOK_SECRET?: string
    }
  }
}
