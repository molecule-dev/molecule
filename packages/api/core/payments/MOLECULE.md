# @molecule/api-payments

Payments core interface for molecule.dev.

Defines common types and interfaces for payment providers.

## Quick Start

```ts
// Server-side handler: verify BEFORE granting. The bonded provider implements
// PaymentProviderInterface; the client sends only an opaque id/receipt, never a
// status or amount. Bonds return null unless the provider confirms a real,
// currently-entitled subscription — so `sub != null` IS the entitlement gate.
import { get } from '@molecule/api-bond'
import type { PaymentProviderInterface } from '@molecule/api-payments'

router.post('/subscriptions/activate', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: 'Authentication required.' })

  // Stripe-style; Apple/Google use payments.verifyReceipt(receipt, productId) /
  // payments.verifyPurchase(purchaseToken, productId) with the same null contract.
  const payments = get<PaymentProviderInterface>('payments', 'stripe')
  const sub = payments?.verifySubscription
    ? await payments.verifySubscription(req.body.subscriptionId) // opaque `cs_…`/`sub_…` id
    : null
  if (!sub) {
    return res.status(402).json({ error: 'No active subscription.' }) // trust the verify, not the client
  }
  if (sub.transactionId && (await paymentExists(sub.transactionId))) {
    return res.status(409).json({ error: 'This subscription is already linked.' }) // replay guard
  }
  await grantEntitlement(userId, sub) // store the VERIFIED result server-side
  res.json({ expiresAt: sub.expiresAt, autoRenews: sub.autoRenews })
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-payments
```

## API

### Interfaces

#### `CreateSetupIntentParams`

Parameters for creating a SetupIntent (off-session card-save flow).

```typescript
interface CreateSetupIntentParams {
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
```

#### `NormalizedPurchase`

Normalized purchase information (for one-time purchases).

```typescript
interface NormalizedPurchase {
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
```

#### `NormalizedSubscription`

Normalized subscription information.

Use this interface to abstract away provider-specific differences.

```typescript
interface NormalizedSubscription {
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
```

#### `ParsedNotification`

Parsed server-to-server notification from a payment provider.

```typescript
interface ParsedNotification {
  transactionId?: string
  productId?: string
  type: string
  expiresAt?: string
  autoRenews?: boolean
}
```

#### `PaymentProviderInterface`

Full payment provider bond interface. Each provider implements the
methods relevant to its platform; all methods are optional since
different platforms (Stripe, Apple, Google) use different flows.

```typescript
interface PaymentProviderInterface {
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
```

#### `PaymentRecordService`

Payment record service for managing payment/transaction records.

```typescript
interface PaymentRecordService {
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
```

#### `Plan`

Plan definition for subscription management.

```typescript
interface Plan {
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
```

#### `PlanService`

Plan service interface for subscription plan lookups.

```typescript
interface PlanService {
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
```

#### `ProviderPaymentMethod`

Card-style payment method metadata returned by the provider.

```typescript
interface ProviderPaymentMethod {
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
```

#### `PurchaseVerifier` *(deprecated)*

Interface for purchase verification (one-time purchases).

```typescript
interface PurchaseVerifier {
  /**
   * Verifies a one-time purchase and returns normalized data, or `null` if invalid.
   */
  verifyPurchase(productId: string, token: string): Promise<NormalizedPurchase | null>
}
```

#### `SetupIntentResult`

Result of creating a SetupIntent.

```typescript
interface SetupIntentResult {
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
```

#### `SubscriptionUpdateResult`

Result of updating or creating a subscription.

```typescript
interface SubscriptionUpdateResult {
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
```

#### `SubscriptionVerifier` *(deprecated)*

Interface for subscription verification.

```typescript
interface SubscriptionVerifier {
  /**
   * Verifies a subscription and returns normalized data, or `null` if invalid.
   */
  verifySubscription(productId: string, token: string): Promise<NormalizedSubscription | null>
}
```

#### `TaggedError`

A "tagged error" — the convention `@molecule/api-secrets`'s
`configNotConfiguredError()` and `@molecule/api-resource`'s `respondError()`
use to carry an HTTP status + a machine-readable key on an `Error` so a
caught error can be re-surfaced with its REAL status instead of being
flattened to a generic failure.

```typescript
interface TaggedError extends Error {
  /** HTTP status the error should be reported with (e.g. `503`). */
  statusCode: number
  /** Machine-readable key the frontend/operator maps to a specific cause. */
  errorKey: string
}
```

#### `VerifiedSubscription`

Result of verifying a subscription or receipt.

```typescript
interface VerifiedSubscription {
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
```

#### `WebhookEvent`

Parsed webhook event from a payment provider.

```typescript
interface WebhookEvent {
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
```

### Types

#### `PaymentNotificationFlow`

How a payment provider receives notifications.

- `'webhook'` — Stripe-style: signed webhook with event type in payload
- `'server-notification'` — Apple/Google-style: server-to-server notification body

```typescript
type PaymentNotificationFlow = 'webhook' | 'server-notification'
```

#### `PaymentProvider`

Payment provider bond interface.

Each payment provider implements the methods relevant to its platform.
All methods are optional since different platforms use different flows.

```typescript
type PaymentProvider = PaymentProviderInterface
```

#### `PaymentProviderName`

Payment provider name.

Open string type so new providers can be added without modifying the core.
Well-known values include 'stripe', 'apple', and 'google'.

```typescript
type PaymentProviderName = string
```

#### `PaymentProviderType`

Alias for `PaymentProviderName`; see `PaymentProviderInterface` for the bond interface.

```typescript
type PaymentProviderType = PaymentProviderName
```

#### `PaymentVerifyFlow`

How a payment provider's verify endpoint should be invoked.

- `'subscription'` — Stripe-style: client sends subscriptionId
- `'receipt'` — Apple/Google-style: client sends receipt + planKey

```typescript
type PaymentVerifyFlow = 'subscription' | 'receipt'
```

#### `SubscriptionStatus`

Subscription status across providers.

```typescript
type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'expired'
  | 'past_due'
  | 'trialing'
  | 'paused'
  | 'pending'
  | 'unknown'
```

### Functions

#### `isActiveStatus(status)`

Checks whether a subscription status represents an active subscription.
Returns `true` for `'active'` and `'trialing'` statuses.

```typescript
function isActiveStatus(status: SubscriptionStatus): boolean
```

- `status` — The subscription status to check.

**Returns:** `true` if the subscription is active or trialing.

#### `isConfigNotConfiguredError(error)`

Checks whether a caught value is the tagged "secret not configured" error
thrown by `@molecule/api-secrets`'s `configNotConfiguredError()` — e.g. a
payment bond's `getClient()`-style helper throwing because `STRIPE_SECRET_KEY`
(or `APPLE_SHARED_SECRET`, `GOOGLE_API_SERVICE_KEY_OBJECT`, …) is unset.

```typescript
function isConfigNotConfiguredError(error: unknown): boolean
```

- `error` — The caught value (any type — callers narrow with this predicate).

**Returns:** `true` if `error` carries `statusCode: 503` and `errorKey: 'config.notConfigured'`.

## Available Providers

| Provider | Package |
|----------|---------|
| Apple IAP | `@molecule/api-payments-apple` |
| Google Play | `@molecule/api-payments-google` |
| Stripe | `@molecule/api-payments-stripe` |

## Injection Notes

**Entitlement is granted ONLY on a server-verified payment — NEVER trust the
client.** A browser can claim any subscription status, product id, or "I paid". The
one source of truth is a verification performed in YOUR API: pass the provider's
opaque token/receipt/subscription id to the bonded provider's verify method —
{@link PaymentProviderInterface.verifySubscription} (Stripe-style: the `cs_…`/`sub_…`
id), {@link PaymentProviderInterface.verifyReceipt} (Apple: base64 receipt +
productId), or {@link PaymentProviderInterface.verifyPurchase} (Google: purchase
token + productId). Each calls the provider server-side and returns a
{@link VerifiedSubscription} — or `null` when the purchase is invalid OR not
entitled (expired, refunded, past_due, pending). Grant access from THAT result,
never from a value the client sent.

**The shipped bonds implement {@link PaymentProviderInterface}** — that is what
`bond('payments', provider)` / `get('payments', name)` hands you, and its verify
methods take the OPAQUE id/receipt only. The two-argument
{@link SubscriptionVerifier}/{@link PurchaseVerifier} interfaces (returning
{@link NormalizedSubscription}/{@link NormalizedPurchase}) are `@deprecated`
auxiliary abstractions for app-level services; no `@molecule/api-payments-*` bond
implements them — do not call `verifySubscription(productId, token)` on a bonded
provider (the extra argument is silently ignored and the lookup fails).

**A missing secret (`STRIPE_SECRET_KEY`, `APPLE_SHARED_SECRET`,
`GOOGLE_API_SERVICE_KEY_OBJECT`, …) is a DIFFERENT failure than "not entitled".**
The shipped bonds rethrow a tagged config-not-configured error (see
{@link isConfigNotConfiguredError}) from their verify/update/cancel methods
instead of swallowing it into the same `null` result a genuine verification
failure returns — a resource-layer catch block MUST check
`isConfigNotConfiguredError(error)` and pass its `statusCode`/`errorKey`
through (rather than flattening to a generic 400/500) so the actionable
"which key, where to get it" message reaches the caller instead of only the
server log.

Things a weak integration gets wrong — do NOT:
- read the plan/entitlement from a request body, query param, or client state and act
  on it. Re-verify server-side every time it matters.
- accept an `amount`/`price` from the client. The server owns the price (look it up by
  product/price id); a client-supplied amount is a tampering vector.
- grant the same receipt/transaction twice. Persist the verified `transactionId` /
  `subscriptionId` and reject a replay (one receipt must not unlock two accounts).
- skip webhook signature verification. A provider webhook (Stripe `whsec_…`, Apple/Google
  notifications) MUST have its signature verified before you act on it — an unverified
  webhook body is attacker-controlled.
- expose the provider SECRET key (`sk_…`) to the browser. Only the publishable key is
  client-side; verification + secret keys stay in the API.

When you DO handle a normalized status (a {@link NormalizedSubscription} or a
webhook's {@link WebhookEvent.subscription}), use {@link isActiveStatus} (true for
`active`/`trialing`) instead of hand-checking status strings, and store the
verified result server-side keyed by user.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Starting an upgrade/subscribe from the pricing or billing surface creates a
  checkout session and hands off to the provider flow (redirect or embedded
  element) — the button does something real, not a dead click.
- [ ] Returning from a canceled/abandoned checkout leaves the user on their
  original plan with a sane UI (no phantom entitlement, no error page).
- [ ] Entitlement flips ONLY after server-side verification (webhook or verify
  call) — reloading after a client-side-only "success" must NOT show a paid
  plan unless the server verified it.
- [ ] The current subscription status (plan name, renewal/expiry) renders on the
  account/billing screen, and canceling updates that status visibly.
- [ ] With payment secrets unconfigured, the flow surfaces an actionable
  "credentials not configured" message — not a silent no-op or generic 500.
- [ ] The provider SECRET key never reaches the browser (page + network traffic
  contain only the publishable key).
