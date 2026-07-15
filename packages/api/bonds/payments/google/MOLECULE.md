# @molecule/api-payments-google

Google Play In-App Purchase provider for molecule.dev.

Handles verification of Google Play purchases and subscriptions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-google @googleapis/androidpublisher @molecule/api-bond @molecule/api-i18n @molecule/api-payments @molecule/api-secrets
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

**Returns:** The raw `ProductPurchase` data from Google.

#### `verifySubscription(productId, purchaseToken)`

Verifies a Google Play subscription purchase via the Android Publisher API v3
(`purchases.subscriptionsv2.get`, returning a `SubscriptionPurchaseV2`).

```typescript
function verifySubscription(productId: string, purchaseToken: string): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null>
```

- `productId` — The Google Play subscription product ID (used for context; the token is the lookup key).
- `purchaseToken` — The purchase token received from the Google Play client.

**Returns:** The raw `SubscriptionPurchaseV2` data from Google.

### Constants

#### `paymentProvider`

PaymentProvider-compatible object for Google Play purchases.

```typescript
const paymentProvider: PaymentProviderInterface
```

#### `paymentsGoogleSecretDefinitions`

Secret definitions required by the Google Play payments bond.

```typescript
const paymentsGoogleSecretDefinitions: SecretDefinition[]
```

### Namespaces

#### `androidpublisher_v3`

## Core Interface
Implements `@molecule/api-payments` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-google'

export function setupPaymentsGoogle(): void {
  bond('payments', 'google', paymentProvider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `GOOGLE_API_SERVICE_KEY_OBJECT` *(required)* — Google service account key (JSON)
  - Setup: Create a service account with Android Publisher access in Google Cloud Console, create a JSON key, and paste the full JSON.
  - Get it here: [https://console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
  - Example: `{"type":"service_account",...}`
- `GOOGLE_PLAY_PACKAGE_NAME` *(required)* — Google Play package name
  - Setup: Your Android application ID as published on Google Play (used to verify purchases).
  - Example: `com.example.app`

### Runtime Dependencies

- `@googleapis/androidpublisher`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-payments`
- `@molecule/api-secrets`

**`parseNotification` handles all three RTDN kinds** — `subscriptionNotification`
(the primary flow: verified via `purchases.subscriptionsv2.get`, mapped to
`renewed`/`canceled`/`expired`/etc.), `oneTimeProductNotification` (verified via
`purchases.products.get`, mapped to `purchased`/`canceled` — no `expiresAt` is
ever set, since a one-time purchase doesn't expire; a generic subscription-plan
handler correctly no-ops on `'purchased'`, so apps selling one-time products
must handle that `type` explicitly), and `voidedPurchaseNotification` (a
refund/chargeback for EITHER kind — mapped to `refund`; NOT re-verified against
Google's API, since the payload carries no product id to verify against, only
used to look up an EXISTING payment record by `transactionId`/`orderId` and
revoke it, so a forged one can only no-op, never grant). `testNotification`
(Play Console's "Send test notification") logs at `info` and returns `null`.

**A missing `GOOGLE_API_SERVICE_KEY_OBJECT`/`GOOGLE_PLAY_PACKAGE_NAME` is NOT
the same as "invalid purchase."** Both throw a tagged config-not-configured
error; `verifyPurchase` on {@link paymentProvider} detects that tag
(`isConfigNotConfiguredError` from `@molecule/api-payments`) and RETHROWS it
instead of swallowing it into the same `null` a genuine bad-token verification
returns — so a caller can tell "the operator forgot to set the secret" apart
from "this purchase isn't valid" and surface the actionable 503.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks; use the
provider's TEST mode — test cards/sandbox accounts, never a live charge),
adapt each item to this app's actual screens/flows, and check every box off
one by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Starting an upgrade/subscribe from the pricing or billing surface creates a
  checkout session and hands off to the provider flow (redirect or embedded
  element) — the button does something real, not a dead click.
- [ ] Returning from a canceled/abandoned checkout leaves the user on their
  original plan with a sane UI (no phantom entitlement, no error page).
- [ ] Entitlement flips ONLY after server-side verification (webhook or verify
  call) — reloading after a client-side-only "success" must NOT show a paid
  plan unless the server verified it. The sandbox CAPTURES webhook deliveries
  — read them with the `read_activity` tool (filter type 'webhook'); never
  mock the event or modify production code to fake an entitlement.
- [ ] The current subscription status (plan name, renewal/expiry) renders on the
  account/billing screen, and canceling updates that status visibly.
- [ ] With payment secrets unconfigured, the flow surfaces an actionable
  "credentials not configured" message — not a silent no-op or generic 500.
- [ ] The provider SECRET key never reaches the browser (page + network traffic
  contain only the publishable key).

## Translations

Translation strings are provided by `@molecule/api-locales-payments-google`.
