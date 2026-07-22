/**
 * Type definitions for the PayPal payment provider.
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
 * An HATEOAS link PayPal returns on created/retrieved resources.
 */
export interface PayPalLink {
  href: string
  rel: string
  method?: string
}

/**
 * A PayPal Billing Plan (`/v1/billing/plans`). Plans are the PRICE-level
 * object apps configure in their plan catalogue (`P-...` ids) — the direct
 * analog of a Stripe Price.
 */
export interface PayPalPlan {
  id: string
  /** The parent catalog product id — the analog of a Stripe Product. */
  product_id: string
  name?: string
  status?: string
  description?: string
  billing_cycles?: Array<{
    frequency?: { interval_unit?: string; interval_count?: number }
    tenure_type?: string
    sequence?: number
    total_cycles?: number
    pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } }
  }>
}

/**
 * A PayPal Billing Subscription (`/v1/billing/subscriptions`, `I-...` ids).
 */
export interface PayPalSubscription {
  id: string
  /**
   * Raw PayPal status: `APPROVAL_PENDING` | `APPROVED` | `ACTIVE` |
   * `SUSPENDED` | `CANCELLED` | `EXPIRED`.
   */
  status: string
  plan_id: string
  /** Free-form id set at creation (used to carry the molecule user id). */
  custom_id?: string
  start_time?: string
  create_time?: string
  update_time?: string
  status_update_time?: string
  subscriber?: {
    payer_id?: string
    email_address?: string
    name?: { given_name?: string; surname?: string }
  }
  billing_info?: {
    next_billing_time?: string
    last_payment?: { amount?: { value?: string; currency_code?: string }; time?: string }
    failed_payments_count?: number
  }
  links?: PayPalLink[]
}

/**
 * A PayPal v2 Checkout Order (`/v2/checkout/orders`).
 */
export interface PayPalOrder {
  id: string
  /** Raw PayPal status: `CREATED` | `SAVED` | `APPROVED` | `VOIDED` | `COMPLETED` | `PAYER_ACTION_REQUIRED`. */
  status: string
  intent?: string
  create_time?: string
  payer?: {
    payer_id?: string
    email_address?: string
  }
  purchase_units?: Array<{
    reference_id?: string
    custom_id?: string
    amount?: { currency_code?: string; value?: string }
    payments?: {
      captures?: Array<{
        id?: string
        status?: string
        create_time?: string
        amount?: { currency_code?: string; value?: string }
      }>
    }
  }>
  links?: PayPalLink[]
}

/**
 * Result of creating a billing subscription or a checkout order: the
 * resource id plus the buyer-facing approval URL (the checkout redirect).
 */
export interface CheckoutSessionResult {
  id: string
  /** The PayPal approval link the buyer is redirected to (the checkout URL). */
  url: string | null
}

/**
 * Result of verifying a PayPal webhook via
 * `/v1/notifications/verify-webhook-signature` + parsing the event payload.
 */
export interface WebhookEventResult {
  /** The PayPal event id (`WH-...`), useful for idempotent handling. */
  id?: string
  /** The PayPal event type (e.g. `BILLING.SUBSCRIPTION.ACTIVATED`). */
  type: string
  /** The event's `resource` object (subscription, sale, ...). */
  resource: Record<string, unknown>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The PayPal REST app client ID (sandbox or live).
       */
      PAYPAL_CLIENT_ID?: string

      /**
       * The PayPal REST app secret (sandbox or live).
       */
      PAYPAL_CLIENT_SECRET?: string

      /**
       * The PayPal API base URL. Defaults to the sandbox host.
       */
      PAYPAL_BASE_URL?: string

      /**
       * The PayPal webhook ID used for webhook signature verification.
       */
      PAYPAL_WEBHOOK_ID?: string
    }
  }
}
