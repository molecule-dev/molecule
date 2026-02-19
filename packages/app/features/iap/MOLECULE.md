# @molecule/app-iap

In-App Purchases interface for molecule.dev.

Provides a unified API for in-app purchases that works across
different platforms (iOS App Store, Google Play, web Stripe).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-iap
```

## API

### Interfaces

#### `IAPError`

In-app purchase error with error code, product ID, and platform-specific details.

```typescript
interface IAPError {
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
```

#### `IAPProvider`

In-App Purchases provider interface.

```typescript
interface IAPProvider {
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
```

#### `Product`

Full in-app product details (ID, type, state, pricing, ownership, transaction, subscription info).

```typescript
interface Product {
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
```

#### `ProductDefinition`

Product definition for registration.

```typescript
interface ProductDefinition {
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
```

#### `PurchaseResult`

Outcome of a purchase attempt (success flag, product, transaction, or error).

```typescript
interface PurchaseResult {
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
```

#### `Transaction`

Purchase transaction record (ID, receipt, purchase token, timestamps, validity).

```typescript
interface Transaction {
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
```

#### `VerificationResult`

Verification result from server.

```typescript
interface VerificationResult {
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
```

### Types

#### `ErrorEventHandler`

Event handler called with an IAPError when a purchase error occurs.

```typescript
type ErrorEventHandler = (error: IAPError) => void
```

#### `IAPEvent`

IAP lifecycle events: ready, product-updated, approved, finished, cancelled, error, pending, expired, restored.

```typescript
type IAPEvent =
  | 'ready'
  | 'product-updated'
  | 'approved'
  | 'finished'
  | 'cancelled'
  | 'error'
  | 'pending'
  | 'expired'
  | 'restored'
```

#### `IAPEventHandler`

Generic event handler for IAP events.

```typescript
type IAPEventHandler<T = unknown> = (data: T) => void
```

#### `ProductEventHandler`

Event handler called with a Product when a product-related event occurs.

```typescript
type ProductEventHandler = (product: Product) => void
```

#### `ProductState`

Purchase lifecycle state of an in-app product (registered, valid, approved, owned, cancelled, etc.).

```typescript
type ProductState =
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
```

#### `ProductType`

In-app purchase product categories: one-time consumable, permanent non-consumable, or recurring subscription.

```typescript
type ProductType = 'consumable' | 'non-consumable' | 'subscription'
```

#### `SubscriptionPeriod`

Subscription billing interval: weekly, monthly, yearly, or lifetime.

```typescript
type SubscriptionPeriod = 'weekly' | 'monthly' | 'yearly' | 'lifetime'
```

### Functions

#### `createNoopIAPProvider()`

Creates a no-op IAP provider for web/testing.

```typescript
function createNoopIAPProvider(): IAPProvider
```

**Returns:** A no-op IAP provider that stubs all purchase operations.

#### `finish(product)`

Finishes a pending transaction, acknowledging delivery to the store.

```typescript
function finish(product: Product): void
```

- `product` — The product whose transaction should be finalized.

**Returns:** Nothing.

#### `get(idOrAlias)`

Gets a product by its store ID or registered alias.

```typescript
function get(idOrAlias: string): Product | undefined
```

- `idOrAlias` — The product store ID or alias to look up.

**Returns:** The matching product, or undefined if not found.

#### `getAll()`

Gets all registered products.

```typescript
function getAll(): Product[]
```

**Returns:** An array of all available products.

#### `getErrorMessage(error, t)`

Gets a user-friendly error message.

```typescript
function getErrorMessage(error: unknown, t?: ((key: string, values?: Record<string, unknown>, options?: { defaultValue?: string; }) => string)): string
```

- `error` — The IAP error object or unknown thrown value to translate.
- `t` — Optional i18n translation function for localized messages.

**Returns:** A user-friendly error message string.

#### `getProvider()`

Gets the current IAP provider. Falls back to a no-op provider if none has been bonded.

```typescript
function getProvider(): IAPProvider
```

**Returns:** The active IAP provider instance.

#### `hasProvider()`

Checks if an IAP provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether an IAP provider is currently registered.

#### `initialize()`

Initializes the IAP system via the active provider.

```typescript
function initialize(): Promise<void>
```

**Returns:** A promise that resolves when initialization is complete.

#### `isAvailable()`

Checks if in-app purchases are available on the current platform.

```typescript
function isAvailable(): boolean
```

**Returns:** Whether the IAP system is available and functional.

#### `manageSubscriptions()`

Opens the platform's subscription management UI.

```typescript
function manageSubscriptions(): void
```

**Returns:** Nothing.

#### `order(idOrAlias)`

Initiates a purchase order for a product.

```typescript
function order(idOrAlias: string): Promise<PurchaseResult>
```

- `idOrAlias` — The product store ID or alias to purchase.

**Returns:** A promise that resolves with the purchase result.

#### `refresh()`

Refreshes product information from the store.

```typescript
function refresh(): Promise<void>
```

**Returns:** A promise that resolves when product data has been refreshed.

#### `register(products)`

Registers product definitions with the IAP provider.

```typescript
function register(products: ProductDefinition[]): void
```

- `products` — The product definitions to register for purchase availability.

**Returns:** Nothing.

#### `restore()`

Restores previously completed purchases from the store.

```typescript
function restore(): Promise<Product[]>
```

**Returns:** A promise that resolves with an array of restored products.

#### `setProvider(provider)`

Sets the IAP provider.

```typescript
function setProvider(provider: IAPProvider): void
```

- `provider` — The IAP provider implementation to bond.

#### `verify(product, verifyUrl, additionalData)`

Verifies a purchase receipt with a server endpoint.

```typescript
function verify(product: Product, verifyUrl: string, additionalData?: Record<string, unknown>): Promise<VerificationResult>
```

- `product` — The product whose purchase receipt to verify.
- `verifyUrl` — The server URL to send the verification request to.
- `additionalData` — Extra data to include in the verification payload.

**Returns:** A promise that resolves with the server verification result.

### Constants

#### `errorMessages`

Error code mapping for user-friendly messages.
Derived from defaultTranslations to avoid duplicating strings.

```typescript
const errorMessages: Record<string, string>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-iap`.
