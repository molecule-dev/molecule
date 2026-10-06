/**
 * Types for the payments capture provider and its in-memory ledger.
 *
 * Record shapes use the Stripe vocabulary (subscription statuses, `cus_` /
 * `sub_` / `cs_` id prefixes, period ends in Unix seconds) because the capture
 * provider stands in for a Stripe-style hosted-checkout vendor.
 *
 * @module
 */

import type { PaymentProviderInterface, WebhookEvent } from '@molecule/api-payments'

/**
 * Raw subscription status, in the vendor's (Stripe's) vocabulary.
 */
export type CaptureSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'

/** Billing interval of a captured price. */
export type CaptureInterval = 'day' | 'week' | 'month' | 'year'

/** One entry of the optional price catalogue. */
export interface CapturePrice {
  /** The product this price belongs to. Defaults to the price id itself. */
  productId?: string
  /** Unit amount in the currency's minor unit (cents). */
  unitAmount?: number
  /** ISO currency code, lowercase. Defaults to `'usd'`. */
  currency?: string
  /** Billing interval. Defaults to `'month'`. */
  interval?: CaptureInterval
}

/** A simulated customer. */
export interface CapturedCustomer {
  /** Customer id (`cus_capture_…`). */
  id: string
  /** The app user the customer was created for, when known. */
  userId?: string
  /** Creation time (ms). */
  createdAt: number
}

/** A simulated hosted-checkout session. */
export interface CapturedCheckoutSession {
  /** Session id (`cs_capture_…`). */
  id: string
  /** The app user who started checkout. */
  userId: string
  /** The customer the session bills. */
  customerId: string
  /** Price being purchased. */
  priceId: string
  /** Product of that price. */
  productId: string
  /** Units (seats) being purchased. */
  quantity: number
  /** `open` until completed, `complete` once paid, `expired` when declined or abandoned. */
  status: 'open' | 'complete' | 'expired'
  /** The subscription created when the session completed. */
  subscriptionId?: string
  /** URL handed back as `checkoutUrl` (the app's success URL with the session id filled in). */
  url: string
  /** Where a completed checkout returns the buyer. */
  successUrl: string
  /** Where an abandoned checkout returns the buyer. */
  cancelUrl: string
  /** Creation time (ms). */
  createdAt: number
}

/** A simulated subscription. */
export interface CapturedSubscription {
  /** Subscription id (`sub_capture_…`). */
  id: string
  /** Subscription item id (`si_capture_…`). */
  itemId: string
  /** The billed customer. */
  customerId: string
  /** The app user the subscription belongs to. */
  userId: string
  /** Current price. */
  priceId: string
  /** Product of the current price. */
  productId: string
  /** Units (seats) billed. */
  quantity: number
  /** Raw status. */
  status: CaptureSubscriptionStatus
  /** Current period start (Unix seconds). */
  currentPeriodStart: number
  /** Current period end (Unix seconds). */
  currentPeriodEnd: number
  /** Whether the subscription ends at the period end instead of renewing. */
  cancelAtPeriodEnd: boolean
  /** When it was canceled (Unix seconds), if it was. */
  canceledAt: number | null
  /** Creation time (ms). */
  createdAt: number
}

/** A simulated SetupIntent (saved-card flow). */
export interface CapturedSetupIntent {
  /** SetupIntent id (`seti_capture_…`). */
  id: string
  /** Client secret returned to the caller. */
  clientSecret: string
  /** The customer the card will attach to. */
  customerId: string
  /** `requires_payment_method` until confirmed with a card, then `succeeded`. */
  status: 'requires_payment_method' | 'succeeded'
  /** The payment method created on confirmation. */
  paymentMethodId?: string
  /** Metadata passed at creation. */
  metadata: Record<string, string>
  /** Creation time (ms). */
  createdAt: number
}

/** A simulated saved card. */
export interface CapturedPaymentMethod {
  /** Payment method id (`pm_capture_…`). */
  id: string
  /** The customer it is attached to, or `null` once detached. */
  customerId: string | null
  /** Card brand. */
  brand: string
  /** Last four digits. */
  last4: string
  /** Expiry month (1–12). */
  expMonth: number
  /** Four-digit expiry year. */
  expYear: number
  /** Creation time (ms). */
  createdAt: number
}

/** A recorded refund. */
export interface CapturedRefund {
  /** Refund id (`re_capture_…`). */
  id: string
  /** The refunded subscription. */
  subscriptionId: string
  /** Amount refunded in minor units, or `null` when no price amount is known. */
  amount: number | null
  /** Currency of the amount. */
  currency: string
  /** Free-text reason, when given. */
  reason?: string
  /** Whether the refund also canceled the subscription immediately. */
  canceledSubscription: boolean
  /** Creation time (ms). */
  createdAt: number
}

/** A recorded billing-portal session. */
export interface CapturedPortalSession {
  /** Portal session id (`bps_capture_…`). */
  id: string
  /** The app user who opened it. */
  userId: string
  /** The customer it was opened for. */
  customerId: string
  /** URL returned to the caller. */
  url: string
  /** Creation time (ms). */
  createdAt: number
}

/** A webhook event built by `buildWebhookRequest`. */
export interface CapturedWebhookEvent {
  /** Event id (`evt_capture_…`). */
  id: string
  /** Raw event type (e.g. `customer.subscription.updated`). */
  type: string
  /** The exact raw body that was signed. */
  rawBody: string
  /** The signature header value. */
  signature: string
  /** Creation time (ms). */
  createdAt: number
}

/** A webhook request received by `handleWebhookEvent`. */
export interface CapturedWebhookDelivery {
  /** Whether the signature verified. */
  verified: boolean
  /** The raw event type, when the body parsed. */
  type?: string
  /** The event id, when the body parsed. */
  eventId?: string
  /** The normalized result returned to the caller (`null` when rejected). */
  result: WebhookEvent | null
  /** Receipt time (ms). */
  receivedAt: number
}

/** One call made on the provider interface. */
export interface CapturedOperation {
  /** Interface method name. */
  method: string
  /** Arguments it was called with. */
  args: unknown
  /** What the call returned, or the error message it threw. */
  outcome: 'ok' | 'null' | 'refused' | 'error'
  /** Call time (ms). */
  at: number
}

/** Snapshot of everything the capture ledger holds. */
export interface CapturedPayments {
  /** Customers, in creation order. */
  customers: CapturedCustomer[]
  /** Checkout sessions, in creation order. */
  checkoutSessions: CapturedCheckoutSession[]
  /** Subscriptions, in creation order. */
  subscriptions: CapturedSubscription[]
  /** SetupIntents, in creation order. */
  setupIntents: CapturedSetupIntent[]
  /** Saved cards, in creation order. */
  paymentMethods: CapturedPaymentMethod[]
  /** Refunds, in creation order. */
  refunds: CapturedRefund[]
  /** Billing-portal sessions, in creation order. */
  portalSessions: CapturedPortalSession[]
  /** Webhook events built for local delivery. */
  webhookEvents: CapturedWebhookEvent[]
  /** Webhook requests received by `handleWebhookEvent`. */
  webhookDeliveries: CapturedWebhookDelivery[]
  /** Every interface call, in order. */
  operations: CapturedOperation[]
}

/** Options for `createPaymentsCaptureProvider`. */
export interface PaymentsCaptureOptions {
  /**
   * Name the provider reports and puts in checkout redirect URLs. Defaults to
   * `'stripe'`, so it can be bonded under the name the production Stripe bond
   * uses and the app's routes (`/verify-payment/stripe`) do not change.
   */
  providerName?: string
  /**
   * Webhook signing secret. Defaults to `PAYMENTS_CAPTURE_WEBHOOK_SECRET`,
   * then the built-in dev secret `whsec_capture_dev_secret`.
   */
  webhookSecret?: string
  /** Webhook replay window in seconds. Defaults to 300. */
  webhookToleranceSeconds?: number
  /**
   * Whether a new checkout completes (as paid) the moment it is created.
   * Defaults to `true`. Set `false` to complete or decline it yourself with
   * `completeCheckout()`.
   */
  autoCompleteCheckout?: boolean
  /** Price catalogue, keyed by price id. Unlisted prices are accepted unless `strictCatalog` is set. */
  catalog?: Record<string, CapturePrice>
  /** Reject prices missing from `catalog`, as a real vendor would. Defaults to `false`. */
  strictCatalog?: boolean
  /** Clock, in milliseconds. Defaults to `Date.now`. */
  now?: () => number
  /** Ledger to record into. Defaults to the shared module ledger. */
  ledger?: PaymentsCaptureLedgerStore
}

/**
 * Storage used by the capture provider. {@link PaymentsCaptureLedger} is the
 * implementation; the interface exists so the type of `options.ledger` does
 * not depend on the class.
 */
export interface PaymentsCaptureLedgerStore {
  /** Mutable record lists. */
  readonly records: CapturedPayments
  /** Issues the next deterministic id for a prefix (`sub` → `sub_capture_000001`). */
  nextId(prefix: string): string
  /** Returns a deep copy of every record. */
  snapshot(): CapturedPayments
  /** Removes every record and resets id counters. */
  clear(): void
}

/** Input for `buildWebhookRequest`. */
export interface BuildWebhookRequestInput {
  /** Raw event type, e.g. `customer.subscription.updated`. */
  type: string
  /** Subscription whose current state becomes `data.object` (for `customer.subscription.*`). */
  subscriptionId?: string
  /** Checkout session whose current state becomes `data.object` (for `checkout.session.*`). */
  checkoutSessionId?: string
  /** Explicit `data.object`, for any other event type. */
  object?: Record<string, unknown>
  /** Sign at this time (ms) instead of now — for replay-window tests. */
  signedAt?: number
  /** Sign with this secret instead of the provider's — for forged-signature tests. */
  secret?: string
}

/** A webhook request ready to POST to an app's webhook route. */
export interface CaptureWebhookRequest {
  /** The exact raw JSON body — send these bytes unchanged. */
  rawBody: string
  /** Same as `rawBody`; lets the object be passed straight to `handleWebhookEvent`. */
  body: string
  /** Headers to send (`stripe-signature`, `content-type`). */
  headers: Record<string, string>
  /** The event object that was serialized. */
  event: Record<string, unknown>
}

/** Card details for `confirmSetupIntent`. */
export interface CaptureCardInput {
  /** Card brand. Defaults to `'visa'`. */
  brand?: string
  /** Last four digits. Defaults to `'4242'`. */
  last4?: string
  /** Expiry month. Defaults to 12. */
  expMonth?: number
  /** Expiry year. Defaults to three years from now. */
  expYear?: number
}

/** Input for `refund`. */
export interface CaptureRefundInput {
  /** The subscription to refund. */
  subscriptionId: string
  /** Amount in minor units. Defaults to the catalogue price × quantity, else `null`. */
  amount?: number
  /** Free-text reason. */
  reason?: string
  /** Also cancel the subscription immediately. Defaults to `true`. */
  cancelSubscription?: boolean
}

/**
 * The capture provider: the full {@link PaymentProviderInterface} plus helpers
 * that drive the simulated vendor (complete a checkout, renew, fail a renewal,
 * refund, build a signed webhook) and read its ledger.
 */
export interface PaymentsCaptureProvider extends PaymentProviderInterface {
  /** Always `true` — lets app code and tests tell the simulator apart. */
  readonly isCapture: true
  /** The ledger this provider records into. */
  readonly ledger: PaymentsCaptureLedgerStore
  /** The webhook secret requests are signed and verified with. */
  readonly webhookSecret: string
  /**
   * Completes an open checkout. `paid` (default) creates an active
   * subscription; `declined` expires the session with nothing created.
   */
  completeCheckout(
    sessionId: string,
    options?: { outcome?: 'paid' | 'declined' },
  ): CapturedCheckoutSession
  /** Advances a subscription by one period, as a successful renewal payment would. */
  renewSubscription(subscriptionId: string): CapturedSubscription
  /** Marks a subscription `past_due`, as a failed renewal payment would. */
  failRenewal(subscriptionId: string): CapturedSubscription
  /** Records a refund (and by default cancels the subscription now). */
  refund(input: CaptureRefundInput): CapturedRefund
  /** Confirms a SetupIntent with a simulated card and returns the saved card. */
  confirmSetupIntent(setupIntentId: string, card?: CaptureCardInput): CapturedPaymentMethod
  /** Builds a signed webhook request in the vendor's event shape. */
  buildWebhookRequest(input: BuildWebhookRequestInput): CaptureWebhookRequest
  /** Returns a deep copy of this provider's ledger. */
  getCaptured(): CapturedPayments
  /** Empties this provider's ledger. */
  clear(): void
}
