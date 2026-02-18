/**
 * In-App Purchases types for molecule.dev.
 *
 * @module
 */

/**
 * In-app purchase product categories: one-time consumable, permanent non-consumable, or recurring subscription.
 */
export type ProductType = 'consumable' | 'non-consumable' | 'subscription'

/**
 * Purchase lifecycle state of an in-app product (registered, valid, approved, owned, cancelled, etc.).
 */
export type ProductState =
  | 'registered'
  | 'valid'
  | 'invalid'
  | 'requested'
  | 'initiated'
  | 'approved'
  | 'finished'
  | 'owned'
  | 'cancelled'
  | 'downloading'

/**
 * Subscription billing interval: weekly, monthly, yearly, or lifetime.
 */
export type SubscriptionPeriod = 'weekly' | 'monthly' | 'yearly' | 'lifetime'

/**
 * Product definition for registration.
 */
export interface ProductDefinition {
  /**
   * Product ID (SKU) - platform-specific identifier.
   */
  id: string

  /**
   * Product alias - cross-platform identifier.
   */
  alias: string

  /**
   * Product type.
   */
  type: ProductType

  /**
   * Product group (for subscription grouping).
   */
  group?: string
}

/**
 * Full in-app product details (ID, type, state, pricing, ownership, transaction, subscription info).
 */
export interface Product {
  /**
   * Product ID (SKU).
   */
  id: string

  /**
   * Product alias.
   */
  alias: string

  /**
   * Product type.
   */
  type: ProductType

  /**
   * Product state.
   */
  state: ProductState

  /**
   * Product title.
   */
  title: string

  /**
   * Product description.
   */
  description: string

  /**
   * Formatted price string.
   */
  price: string

  /**
   * Price in micros (cents * 10000).
   */
  priceMicros: number

  /**
   * Currency code (ISO 4217).
   */
  currency: string

  /**
   * Whether the product can be purchased.
   */
  canPurchase: boolean

  /**
   * Whether the product is owned.
   */
  owned: boolean

  /**
   * Transaction information (if applicable).
   */
  transaction?: Transaction

  /**
   * Subscription period (for subscriptions).
   */
  subscriptionPeriod?: SubscriptionPeriod

  /**
   * Introductory price (for subscriptions with trial).
   */
  introPrice?: string

  /**
   * Trial period in days.
   */
  trialPeriodDays?: number

  /**
   * Product group.
   */
  group?: string

  /**
   * Raw platform-specific data.
   */
  raw?: unknown
}

/**
 * Purchase transaction record (ID, receipt, purchase token, timestamps, validity).
 */
export interface Transaction {
  /**
   * Transaction ID.
   */
  id: string

  /**
   * Platform-specific receipt.
   */
  receipt?: string

  /**
   * App Store receipt (iOS).
   */
  appStoreReceipt?: string

  /**
   * Purchase token (Android).
   */
  purchaseToken?: string

  /**
   * Purchase time.
   */
  purchaseTime?: Date

  /**
   * Expiration time (for subscriptions).
   */
  expirationTime?: Date

  /**
   * Whether the purchase is valid.
   */
  isValid?: boolean

  /**
   * Raw platform-specific data.
   */
  raw?: unknown
}

/**
 * In-app purchase error with error code, product ID, and platform-specific details.
 */
export interface IAPError {
  /**
   * Error code.
   */
  code: string | number

  /**
   * Error message.
   */
  message: string

  /**
   * Product ID (if applicable).
   */
  productId?: string

  /**
   * Raw error.
   */
  raw?: unknown
}

/**
 * Outcome of a purchase attempt (success flag, product, transaction, or error).
 */
export interface PurchaseResult {
  /**
   * Whether the purchase was successful.
   */
  success: boolean

  /**
   * The purchased product.
   */
  product?: Product

  /**
   * Transaction information.
   */
  transaction?: Transaction

  /**
   * Error (if purchase failed).
   */
  error?: IAPError
}

/**
 * Verification result from server.
 */
export interface VerificationResult {
  /**
   * Whether the receipt is valid.
   */
  valid: boolean

  /**
   * Subscription expiration time.
   */
  expirationTime?: Date

  /**
   * Whether the subscription is active.
   */
  isActive?: boolean

  /**
   * Plan/tier information.
   */
  plan?: string

  /**
   * Server response data.
   */
  data?: unknown
}

/**
 * IAP lifecycle events: ready, product-updated, approved, finished, cancelled, error, pending, expired, restored.
 */
export type IAPEvent =
  | 'ready'
  | 'product-updated'
  | 'approved'
  | 'finished'
  | 'cancelled'
  | 'error'
  | 'pending'
  | 'expired'
  | 'restored'

/**
 * Generic event handler for IAP events.
 */
export type IAPEventHandler<T = unknown> = (data: T) => void

/**
 * Event handler called with a Product when a product-related event occurs.
 */
export type ProductEventHandler = (product: Product) => void

/**
 * Event handler called with an IAPError when a purchase error occurs.
 */
export type ErrorEventHandler = (error: IAPError) => void

/**
 * In-App Purchases provider interface.
 */
export interface IAPProvider {
  /**
   * Initializes the IAP system.
   */
  initialize(): Promise<void>

  /**
   * Registers products for purchase.
   */
  register(products: ProductDefinition[]): void

  /**
   * Refreshes product information from the store.
   */
  refresh(): Promise<void>

  /**
   * Gets a product by ID or alias.
   */
  get(idOrAlias: string): Product | undefined

  /**
   * Gets all registered products.
   */
  getAll(): Product[]

  /**
   * Checks if a product can be purchased.
   */
  canPurchase(idOrAlias: string): boolean

  /**
   * Initiates a purchase.
   */
  order(idOrAlias: string): Promise<PurchaseResult>

  /**
   * Finishes a transaction (must be called after successful verification).
   */
  finish(product: Product): void

  /**
   * Verifies a purchase with the server.
   */
  verify(
    product: Product,
    verifyUrl: string,
    additionalData?: Record<string, unknown>,
  ): Promise<VerificationResult>

  /**
   * Restores previous purchases.
   */
  restore(): Promise<Product[]>

  /**
   * Opens the subscription management page.
   */
  manageSubscriptions(): void

  /**
   * Subscribes to product events.
   */
  when(idOrAlias: string): {
    updated: (handler: ProductEventHandler) => void
    approved: (handler: ProductEventHandler) => void
    finished: (handler: ProductEventHandler) => void
    cancelled: (handler: ProductEventHandler) => void
    error: (handler: ErrorEventHandler) => void
  }

  /**
   * Subscribes to global events.
   */
  on(event: IAPEvent, handler: IAPEventHandler): () => void

  /**
   * Unsubscribes from events.
   */
  off(handler: IAPEventHandler): void

  /**
   * Gets the platform name.
   */
  getPlatform(): 'ios' | 'android' | 'web' | 'unknown'

  /**
   * Checks if IAP is available.
   */
  isAvailable(): boolean

  /**
   * Destroys the IAP system.
   */
  destroy(): void
}
