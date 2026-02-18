# @molecule/api-payments-apple

Apple In-App Purchase provider for molecule.dev.

Handles verification of Apple App Store receipts for in-app purchases and subscriptions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-apple
```

## API

### Interfaces

#### `InAppPurchase`

In-app purchase record.

```typescript
interface InAppPurchase {
  quantity: string
  product_id: string
  transaction_id: string
  original_transaction_id: string
  purchase_date: string
  purchase_date_ms: string
  purchase_date_pst: string
  original_purchase_date: string
  original_purchase_date_ms: string
  original_purchase_date_pst: string
  expires_date?: string
  expires_date_ms?: string
  expires_date_pst?: string
  is_trial_period?: string
  is_in_intro_offer_period?: string
  cancellation_date?: string
  cancellation_date_ms?: string
  cancellation_reason?: string
}
```

#### `NormalizedPurchase`

Normalized purchase information (for one-time purchases).

```typescript
interface NormalizedPurchase {
    /**
     * The payment provider.
     */
    provider: PaymentProviderName;
    /**
     * The purchase/transaction ID.
     */
    purchaseId: string;
    /**
     * The product ID.
     */
    productId: string;
    /**
     * Whether the purchase is valid.
     */
    isValid: boolean;
    /**
     * When the purchase was made (Unix timestamp in ms).
     */
    purchaseDate: number;
    /**
     * Raw data from the provider.
     */
    rawData: unknown;
}
```

#### `NormalizedSubscription`

Normalized subscription information.

Use this interface to abstract away provider-specific differences.

```typescript
interface NormalizedSubscription {
    /**
     * The payment provider.
     */
    provider: PaymentProviderName;
    /**
     * The subscription ID from the provider.
     */
    subscriptionId: string;
    /**
     * The product/plan ID.
     */
    productId: string;
    /**
     * Current subscription status.
     */
    status: SubscriptionStatus;
    /**
     * Whether the subscription is currently active.
     */
    isActive: boolean;
    /**
     * When the current period started (Unix timestamp in ms).
     */
    currentPeriodStart?: number;
    /**
     * When the current period ends (Unix timestamp in ms).
     */
    currentPeriodEnd?: number;
    /**
     * Whether the subscription will auto-renew.
     */
    willRenew?: boolean;
    /**
     * When the subscription was canceled (if applicable).
     */
    canceledAt?: number;
    /**
     * Raw data from the provider.
     */
    rawData: unknown;
}
```

#### `PendingRenewal`

Pending renewal information.

```typescript
interface PendingRenewal {
  auto_renew_product_id: string
  auto_renew_status: string
  expiration_intent?: string
  is_in_billing_retry_period?: string
  product_id: string
  original_transaction_id: string
}
```

#### `VerifyReceiptResponse`

Receipt verification response from Apple.

```typescript
interface VerifyReceiptResponse {
  status: number
  environment?: 'Production' | 'Sandbox'
  receipt?: {
    bundle_id: string
    application_version: string
    in_app?: InAppPurchase[]
  }
  latest_receipt_info?: InAppPurchase[]
  pending_renewal_info?: PendingRenewal[]
}
```

### Types

#### `PaymentProvider`

Payment provider bond interface.

Each payment provider implements the methods relevant to its platform.
All methods are optional since different platforms use different flows.

```typescript
type PaymentProvider = PaymentProviderInterface;
```

#### `SubscriptionStatus`

Subscription status across providers.

```typescript
type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing' | 'paused' | 'pending' | 'unknown';
```

### Functions

#### `getLatestSubscription(response)`

Extracts the subscription with the latest expiration date from a receipt verification response.
Checks both `latest_receipt_info` and `receipt.in_app` arrays.

```typescript
function getLatestSubscription(response: VerifyReceiptResponse): InAppPurchase | null
```

- `response` — The Apple receipt verification response.

**Returns:** The in-app purchase entry with the latest `expires_date_ms`, or `null` if none found.

#### `isSubscriptionActive(subscription)`

Checks whether an Apple subscription is currently active (not expired and not canceled).

```typescript
function isSubscriptionActive(subscription: InAppPurchase | null): boolean
```

- `subscription` — The in-app purchase entry to check, or `null`.

**Returns:** `true` if the subscription's `expires_date_ms` is in the future and it has not been canceled.

#### `normalizeSubscription(subscription)`

Normalizes an Apple in-app purchase entry to the provider-agnostic `NormalizedSubscription` interface.
Maps Apple-specific fields (`expires_date_ms`, `is_trial_period`, `cancellation_date`) to standard status values.

```typescript
function normalizeSubscription(subscription: InAppPurchase): NormalizedSubscription
```

- `subscription` — The Apple in-app purchase entry to normalize.

**Returns:** A `NormalizedSubscription` with provider set to `'apple'` and dates converted to millisecond timestamps.

#### `verifyReceipt(receiptData, useSandbox)`

Verifies an App Store receipt.

```typescript
function verifyReceipt(receiptData: string, useSandbox?: boolean): Promise<VerifyReceiptResponse>
```

- `receiptData` — Base64-encoded receipt data from the App Store client.
- `useSandbox` — When `true`, sends directly to the sandbox endpoint. Automatically retries against sandbox if production returns status 21007.

**Returns:** The parsed receipt verification response from Apple.

### Constants

#### `paymentProvider`

PaymentProvider-compatible adapter for Apple In-App Purchases.

Implements `verifyReceipt` and `parseNotification` from the PaymentProvider interface.

```typescript
const paymentProvider: PaymentProviderInterface
```

## Core Interface
Implements `@molecule/api-payments` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-payments` ^1.0.0

### Environment Variables

- `APPLE_SHARED_SECRET` *(required)*
