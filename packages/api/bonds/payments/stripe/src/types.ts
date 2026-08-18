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
 * Result of creating or retrieving a checkout session.
 */
export interface CheckoutSessionResult {
  id: string
  url: string | null
  /** The Stripe Subscription ID created by the checkout session, if available. */
  subscription?: string
}

/**
 * Normalized subscription data from Stripe.
 */
export interface SubscriptionResult {
  id: string
  status: string
  /**
   * The Stripe Customer ID (`cus_...`) that owns this subscription. Used to bind
   * a verified subscription to the calling user so a foreign subscription id
   * cannot be claimed (ownership check in `verifyPayment`).
   */
  customer?: string
  /**
   * The subscription's line items.
   *
   * `quantity` is the UNITS billed on that line — seats, on a per-seat plan.
   * Carried because an app that sells seats has no other way to learn how many
   * the customer actually paid for: the price id says what a seat costs, never
   * how many were bought, so without this the app can only assume one.
   */
  items: {
    data: Array<{ id: string; quantity?: number; price?: { id?: string; product?: string } }>
  }
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
}

/**
 * Parameters for updating a subscription.
 */
export interface SubscriptionUpdateParams {
  items?: Array<{
    id: string
    price: string
    /**
     * Units to bill — seats, on a per-seat plan. Stripe keeps the existing
     * quantity for any field an update omits, so a caller changing plans must
     * state it: leaving it off bills a new flat-priced plan at the old plan's
     * seat count.
     */
    quantity?: number
  }>
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
