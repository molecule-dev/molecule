/**
 * Payments core types for molecule.dev.
 *
 * @module
 */

/**
 * Payment provider name.
 *
 * Open string type so new providers can be added without modifying the core.
 * Well-known values include 'stripe', 'apple', and 'google'.
 */
export type PaymentProviderName = string

/**
 * Alias for `PaymentProviderName`; see `PaymentProviderInterface` for the bond interface.
 */
export type PaymentProviderType = PaymentProviderName

/**
 * Subscription status across providers.
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'expired'
  | 'past_due'
  | 'trialing'
  | 'paused'
  | 'pending'
  | 'unknown'

/**
 * Normalized subscription information.
 *
 * Use this interface to abstract away provider-specific differences.
 */
export interface NormalizedSubscription {
  /**
   * The payment provider.
   */
  provider: PaymentProviderName

  /**
   * The subscription ID from the provider.
   */
  subscriptionId: string

  /**
   * The product/plan ID.
   */
  productId: string

  /**
   * Current subscription status.
   */
  status: SubscriptionStatus

  /**
   * Whether the subscription is currently active.
   */
  isActive: boolean

  /**
   * When the current period started (Unix timestamp in ms).
   */
  currentPeriodStart?: number

  /**
   * When the current period ends (Unix timestamp in ms).
   */
  currentPeriodEnd?: number

  /**
   * Whether the subscription will auto-renew.
   */
  willRenew?: boolean

  /**
   * When the subscription was canceled (if applicable).
   */
  canceledAt?: number

  /**
   * Raw data from the provider.
   */
  rawData: unknown
}

/**
 * Normalized purchase information (for one-time purchases).
 */
export interface NormalizedPurchase {
  /**
   * The payment provider.
   */
  provider: PaymentProviderName

  /**
   * The purchase/transaction ID.
   */
  purchaseId: string

  /**
   * The product ID.
   */
  productId: string

  /**
   * Whether the purchase is valid.
   */
  isValid: boolean

  /**
   * When the purchase was made (Unix timestamp in ms).
   */
  purchaseDate: number

  /**
   * Raw data from the provider.
   */
  rawData: unknown
}

/**
 * Interface for subscription verification.
 *
 * @remarks
 * Auxiliary abstraction for app-level verification services. The shipped
 * `@molecule/api-payments-*` bonds do NOT implement this two-argument
 * interface — they implement {@link PaymentProviderInterface}, whose
 * `verifySubscription(subscriptionId)` takes only the provider's opaque id.
 */
export interface SubscriptionVerifier {
  /**
   * Verifies a subscription and returns normalized data, or `null` if invalid.
   */
  verifySubscription(productId: string, token: string): Promise<NormalizedSubscription | null>
}

/**
 * Interface for purchase verification (one-time purchases).
 *
 * @remarks
 * Auxiliary abstraction for app-level verification services. The shipped
 * `@molecule/api-payments-*` bonds do NOT implement this interface — they
 * implement {@link PaymentProviderInterface} (`verifyPurchase(receipt, productId)`
 * for Google-style flows).
 */
export interface PurchaseVerifier {
  /**
   * Verifies a one-time purchase and returns normalized data, or `null` if invalid.
   */
  verifyPurchase(productId: string, token: string): Promise<NormalizedPurchase | null>
}

// ─── Bond interfaces ─────────────────────────────────────────────────────────
// These interfaces define the contract for payment provider bonds.
// They were previously in @molecule/api-bond but belong here as domain types.

/**
 * Result of verifying a subscription or receipt.
 */
export interface VerifiedSubscription {
  productId: string
  /**
   * The provider's PRICE identifier for the purchased plan (e.g. a Stripe
   * `price_…` id), when the provider distinguishes prices from products.
   *
   * Apps typically configure their plan catalogue with price ids (that is
   * what checkout is started with and what env vars like
   * `STRIPE_<APP>_PRO_MONTHLY` hold), while providers report the parent
   * product id on subscriptions — so plan resolution should try BOTH
   * `productId` and `priceId` against the registered plans.
   */
  priceId?: string
  transactionId?: string
  expiresAt?: string
  autoRenews?: boolean
  data?: unknown
}

/**
 * Parsed webhook event from a payment provider.
 */
export interface WebhookEvent {
  type: string
  subscription?: {
    customerId?: string
    productId?: string
    /**
     * The provider's PRICE identifier for the subscribed plan (e.g. a Stripe
     * `price_…` id). Apps register their plan catalogue with price ids (see
     * {@link VerifiedSubscription.priceId}), so plan resolution should try
     * BOTH `productId` and `priceId`.
     */
    priceId?: string
    expiresAt?: string
    autoRenews?: boolean
    /**
     * Normalized subscription status at the time of the event.
     *
     * Surfaced so the notification handler can apply the SAME entitlement gate
     * the verify path uses: only an active/trialing subscription confers the
     * plan. A past_due/unpaid/incomplete subscription (e.g. a renewal-payment
     * failure that still advances the period end) must NOT extend entitlement.
     */
    status?: SubscriptionStatus
    /**
     * Whether the subscription is currently active (status active/trialing).
     *
     * Mirrors {@link NormalizedSubscription.isActive}. When `false`, the
     * notification handler must not grant/extend the plan.
     */
    isActive?: boolean
  }
}

/**
 * Parsed server-to-server notification from a payment provider.
 */
export interface ParsedNotification {
  transactionId?: string
  productId?: string
  type: string
  expiresAt?: string
  autoRenews?: boolean
}

/**
 * Result of updating or creating a subscription.
 */
export interface SubscriptionUpdateResult {
  /** Whether the subscription was successfully updated in-place. */
  updated: boolean
  /** If a checkout is required (new subscription), the URL to redirect to. */
  checkoutUrl?: string
  /** Updated subscription details when the update succeeded. */
  subscription?: {
    expiresAt?: string
    autoRenews?: boolean
  }
}

/**
 * Parameters for creating a SetupIntent (off-session card-save flow).
 */
export interface CreateSetupIntentParams {
  /**
   * The provider customer ID (e.g. Stripe `cus_...`).
   *
   * If omitted, the provider may create a customer on demand and return its ID
   * via {@link SetupIntentResult.customerId}.
   */
  customerId?: string
  /** Optional metadata to attach to the SetupIntent. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}

/**
 * Result of creating a SetupIntent.
 */
export interface SetupIntentResult {
  /** Provider SetupIntent ID (e.g. Stripe `seti_...`). */
  id: string
  /**
   * The client secret used by the frontend SDK to confirm the SetupIntent.
   *
   * For Stripe, this is consumed by `stripe.confirmCardSetup(clientSecret, ...)`.
   */
  clientSecret: string
  /**
   * The provider customer ID this SetupIntent is attached to.
   *
   * Returned even when the caller didn't provide one — the provider may create
   * a customer on demand and the resource layer will persist the ID.
   */
  customerId: string
}

/**
 * Card-style payment method metadata returned by the provider.
 */
export interface ProviderPaymentMethod {
  /** Provider payment-method ID (e.g. Stripe `pm_...`). */
  id: string
  /** Card brand (e.g. `visa`, `mastercard`, `amex`). */
  brand: string
  /** Last four digits of the card. */
  last4: string
  /** Two-digit expiry month (1–12). */
  expMonth: number
  /** Four-digit expiry year. */
  expYear: number
}

/**
 * Payment provider bond interface.
 *
 * Each payment provider implements the methods relevant to its platform.
 * All methods are optional since different platforms use different flows.
 */
export type PaymentProvider = PaymentProviderInterface

/**
 * How a payment provider's verify endpoint should be invoked.
 *
 * - `'subscription'` — Stripe-style: client sends subscriptionId
 * - `'receipt'` — Apple/Google-style: client sends receipt + planKey
 */
export type PaymentVerifyFlow = 'subscription' | 'receipt'

/**
 * How a payment provider receives notifications.
 *
 * - `'webhook'` — Stripe-style: signed webhook with event type in payload
 * - `'server-notification'` — Apple/Google-style: server-to-server notification body
 */
export type PaymentNotificationFlow = 'webhook' | 'server-notification'

/**
 * Full payment provider bond interface. Each provider implements the
 * methods relevant to its platform; all methods are optional since
 * different platforms (Stripe, Apple, Google) use different flows.
 */
export interface PaymentProviderInterface {
  readonly providerName: string

  /** How this provider's verify flow works. */
  readonly verifyFlow?: PaymentVerifyFlow

  /** How this provider receives notifications. */
  readonly notificationFlow?: PaymentNotificationFlow

  /** Verify a subscription by ID (Stripe-style). */
  verifySubscription?(subscriptionId: string): Promise<VerifiedSubscription | null>

  /** Verify an IAP receipt (Apple-style). */
  verifyReceipt?(receipt: string, productId: string): Promise<VerifiedSubscription | null>

  /** Verify a purchase (Google-style). */
  verifyPurchase?(receipt: string, productId: string): Promise<VerifiedSubscription | null>

  /** Handle a webhook event from the provider (Stripe-style). */
  handleWebhookEvent?(req: unknown): Promise<WebhookEvent | null>

  /** Parse a server-to-server notification (Apple/Google-style). */
  parseNotification?(body: unknown): Promise<ParsedNotification | null>

  /** Update an existing subscription (change plan) or create a new one. */
  updateSubscription?(params: {
    userId: string
    newProductId: string
    previousProductId?: string
  }): Promise<SubscriptionUpdateResult>

  /** Cancel an existing subscription for a user. */
  cancelSubscription?(params: { userId: string }): Promise<boolean>

  /**
   * Create a SetupIntent for the saved-card flow (Stripe-style).
   *
   * The frontend confirms the SetupIntent with the provider's client SDK
   * using {@link SetupIntentResult.clientSecret}; on success the resulting
   * payment-method ID is sent back to the API for persistence.
   */
  createSetupIntent?(params: CreateSetupIntentParams): Promise<SetupIntentResult>

  /**
   * Look up a saved payment method by ID and return normalized card metadata.
   *
   * Used when a SetupIntent confirms client-side and the resource layer needs
   * brand/last4/exp to persist alongside the provider PM ID.
   */
  getPaymentMethod?(providerPaymentMethodId: string): Promise<ProviderPaymentMethod | null>

  /**
   * Detach a saved payment method from its customer (Stripe-style).
   *
   * Returns `true` on success; returns `false` if the provider call failed.
   */
  detachPaymentMethod?(providerPaymentMethodId: string): Promise<boolean>
}

/**
 * Plan definition for subscription management.
 */
export interface Plan {
  planKey: string
  platformKey: string
  platformProductId: string
  /**
   * The platform's PRICE identifiers that grant this plan (e.g. Stripe
   * `price_…` ids). Apps configure prices — not products — in their env,
   * so implementations should match an incoming platform identifier against
   * `platformProductId` OR membership in this list.
   */
  platformPriceIds?: string[]
  alias: string
  period: string
  price: string
  autoRenews?: boolean
  title: string
  description: string
  shortDescription?: string
  highlightedDescription?: string
  capabilities: Record<string, boolean>
}

/**
 * Plan service interface for subscription plan lookups.
 */
export interface PlanService {
  findPlan(planKey: string): Plan | null
  /**
   * Finds the plan granted by a platform identifier — the platform's product
   * id OR one of the plan's {@link Plan.platformPriceIds}. Callers should try
   * every identifier the platform surfaced (product id, price id).
   */
  findPlanByProductId(productId: string): Plan | null
  getDefaultPlan(): Plan | null
  getAllPlans(): Plan[]
}

/**
 * Payment record service for managing payment/transaction records.
 */
export interface PaymentRecordService {
  store(record: {
    userId: string
    platformKey: string
    transactionId: string
    productId: string
    data: unknown
    receipt?: string
  }): Promise<void>
  findByTransaction(platformKey: string, transactionId: string): Promise<{ userId: string } | null>
  findByCustomerData(
    platformKey: string,
    key: string,
    value: string,
  ): Promise<{ userId: string } | null>
  findByUserId(
    userId: string,
    platformKey: string,
  ): Promise<{ data: unknown; transactionId?: string } | null>
  deleteByUserId(userId: string): Promise<void>
}
