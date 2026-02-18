# @molecule/api-payments-google

Google Play In-App Purchase provider for molecule.dev.

Handles verification of Google Play purchases and subscriptions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-google
```

## API

### Interfaces

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

#### `acknowledgeProduct(productId, purchaseToken)`

Acknowledges a Google Play one-time product purchase. Required by Google to confirm
that the server has processed the purchase; unacknowledged purchases are refunded after 3 days.

```typescript
function acknowledgeProduct(productId: string, purchaseToken: string): Promise<void>
```

- `productId` — The Google Play product ID for the one-time purchase.
- `purchaseToken` — The purchase token received from the Google Play client.

#### `acknowledgeSubscription(productId, purchaseToken)`

Acknowledges a Google Play subscription purchase. Required by Google to confirm
that the server has processed the purchase; unacknowledged purchases are refunded after 3 days.

```typescript
function acknowledgeSubscription(productId: string, purchaseToken: string): Promise<void>
```

- `productId` — The Google Play subscription ID used as `subscriptionId` in the API call.
- `purchaseToken` — The purchase token received from the Google Play client.

#### `isSubscriptionActive(subscription)`

Checks whether a Google Play subscription is currently active by comparing its
`subscriptionState` against `SUBSCRIPTION_STATE_ACTIVE` and `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`.

```typescript
function isSubscriptionActive(subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null): boolean
```

- `subscription` — The Google Play `SubscriptionPurchaseV2` object, or `null`.

**Returns:** `true` if the subscription state is active or in a grace period.

#### `normalizeSubscription(subscription, productId)`

Normalizes a Google Play `SubscriptionPurchaseV2` to the provider-agnostic `NormalizedSubscription` interface.
Maps Google's `subscriptionState` enum to standard status values and extracts period/renewal info from `lineItems[0]`.

```typescript
function normalizeSubscription(subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2, productId: string): NormalizedSubscription
```

- `subscription` — The raw Google Play subscription purchase object.
- `productId` — The product ID to include in the normalized result (not present in the subscription data itself).

**Returns:** A `NormalizedSubscription` with provider set to `'google'` and dates converted to millisecond timestamps.

#### `verifyProduct(productId, purchaseToken)`

Verifies a Google Play one-time (non-subscription) product purchase.

```typescript
function verifyProduct(productId: string, purchaseToken: string): Promise<androidpublisher_v3.Schema$ProductPurchase | null>
```

- `productId` — The Google Play product ID for the one-time purchase.
- `purchaseToken` — The purchase token received from the Google Play client.

**Returns:** The raw `ProductPurchase` data from Google, or `null` on error.

#### `verifySubscription(productId, purchaseToken)`

Verifies a Google Play subscription purchase using the Android Publisher API v2.

```typescript
function verifySubscription(productId: string, purchaseToken: string): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null>
```

- `productId` — The Google Play subscription product ID (used for context; the token is the lookup key).
- `purchaseToken` — The purchase token received from the Google Play client.

**Returns:** The raw `SubscriptionPurchaseV2` data from Google, or `null` on error.

### Constants

#### `paymentProvider`

PaymentProvider-compatible object for Google Play purchases.

```typescript
const paymentProvider: PaymentProviderInterface
```

### Namespaces

#### `androidpublisher_v3`

## Core Interface
Implements `@molecule/api-payments` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-payments` ^1.0.0

### Environment Variables

- `GOOGLE_SERVICE_ACCOUNT_KEY` *(required)*

## Translations

Translation strings are provided by `@molecule/api-locales-payments-google`.
