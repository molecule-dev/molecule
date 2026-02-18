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
 */
export interface SubscriptionVerifier {
  /**
   * Verifies a subscription and returns normalized data, or `null` if invalid.
   */
  verifySubscription(productId: string, token: string): Promise<NormalizedSubscription | null>
}

/**
 * Interface for purchase verification (one-time purchases).
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
    expiresAt?: string
    autoRenews?: boolean
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
}

/**
 * Plan definition for subscription management.
 */
export interface Plan {
  planKey: string
  platformKey: string
  platformProductId: string
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
