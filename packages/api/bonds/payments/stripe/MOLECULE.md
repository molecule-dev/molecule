# @molecule/api-payments-stripe

Stripe payment provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-stripe stripe
```

## API

### Interfaces

#### `CheckoutSessionResult`

Result of creating a checkout session.

```typescript
interface CheckoutSessionResult {
  id: string
  url: string | null
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

#### `SubscriptionResult`

Normalized subscription data from Stripe.

```typescript
interface SubscriptionResult {
  id: string
  status: string
  items: { data: Array<{ id: string; price?: { product?: string } }> }
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
}
```

#### `SubscriptionUpdateParams`

Parameters for updating a subscription.

```typescript
interface SubscriptionUpdateParams {
  items?: Array<{ id: string; price: string }>
  cancel_at_period_end?: boolean
}
```

#### `WebhookEventResult`

Result of verifying a webhook event.

```typescript
interface WebhookEventResult {
  type: string
  data: { object: Record<string, unknown> }
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

#### `cancelSubscription(subscriptionId)`

Immediately cancels a Stripe subscription.

```typescript
function cancelSubscription(subscriptionId: string): Promise<SubscriptionResult>
```

- `subscriptionId` — The Stripe subscription ID to cancel.

**Returns:** The canceled subscription result.

#### `createCheckoutSession(options, options, options, options, options, options)`

Creates a Stripe Checkout session for a new subscription.

```typescript
function createCheckoutSession(options: { priceId: string; successUrl: string; cancelUrl: string; customerId?: string; metadata?: Record<string, string>; }): Promise<CheckoutSessionResult>
```

- `options` — Checkout configuration.
- `options` — .priceId - The Stripe Price ID for the subscription line item.
- `options` — .successUrl - URL to redirect to after successful payment.
- `options` — .cancelUrl - URL to redirect to if the user cancels.
- `options` — .customerId - Optional existing Stripe Customer ID.
- `options` — .metadata - Optional key-value metadata to attach to the session.

**Returns:** The checkout session ID and URL.

#### `getCheckoutSession(sessionId)`

Retrieves a Stripe Checkout session by ID.

```typescript
function getCheckoutSession(sessionId: string): Promise<CheckoutSessionResult>
```

- `sessionId` — The Stripe Checkout session ID.

**Returns:** The session ID and URL.

#### `getClient()`

Returns the lazily-initialized Stripe client. Throws if `STRIPE_SECRET_KEY` is not set.

```typescript
function getClient(): Stripe
```

**Returns:** The shared `Stripe` SDK instance.

#### `getSubscription(subscriptionId)`

Retrieves a Stripe subscription by ID with expanded item data.

```typescript
function getSubscription(subscriptionId: string): Promise<SubscriptionResult>
```

- `subscriptionId` — The Stripe subscription ID.

**Returns:** The normalized subscription result.

#### `normalizeSubscription(subscription)`

Normalizes a Stripe-specific `SubscriptionResult` to the common
`NormalizedSubscription` interface used across all payment providers.

```typescript
function normalizeSubscription(subscription: SubscriptionResult): NormalizedSubscription
```

- `subscription` — The Stripe subscription result to normalize.

**Returns:** A `NormalizedSubscription` with provider-agnostic fields.

#### `updateSubscription(subscriptionId, params)`

Updates a Stripe subscription (e.g. changes plan, sets cancel_at_period_end).

```typescript
function updateSubscription(subscriptionId: string, params: SubscriptionUpdateParams): Promise<SubscriptionResult>
```

- `subscriptionId` — The Stripe subscription ID to update.
- `params` — The Stripe subscription update parameters.

**Returns:** The updated subscription result.

#### `verifyWebhookSignature(payload, signature)`

Verifies a Stripe webhook signature and parses the event payload.
Requires `STRIPE_WEBHOOK_SECRET` env var.

```typescript
function verifyWebhookSignature(payload: string | Buffer<ArrayBufferLike>, signature: string): WebhookEventResult
```

- `payload` — The raw request body (string or Buffer).
- `signature` — The `stripe-signature` header value.

**Returns:** The verified webhook event with type and data.

### Constants

#### `paymentProvider`

PaymentProvider-compatible adapter for Stripe.

Wraps the Stripe SDK functions into a `PaymentProvider`-compatible object
for use with the molecule bond system. Supports subscription verification,
webhook handling, plan upgrades/downgrades, and cancellation.

```typescript
const paymentProvider: PaymentProviderInterface
```

## Core Interface
Implements `@molecule/api-payments` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-jwt` ^1.0.0

### Environment Variables

- `STRIPE_SECRET_KEY` *(required)*
- `STRIPE_WEBHOOK_SECRET` *(required)*

### Runtime Dependencies

- `stripe`

## Translations

Translation strings are provided by `@molecule/api-locales-payments-stripe`.
