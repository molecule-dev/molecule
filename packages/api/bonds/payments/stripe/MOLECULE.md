# @molecule/api-payments-stripe

Stripe payment provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-stripe @molecule/api-bond @molecule/api-i18n @molecule/api-jwt @molecule/api-payments @molecule/api-secrets stripe
```

## API

### Interfaces

#### `AccountStatus`

Connected-account onboarding / payout eligibility status.

```typescript
interface AccountStatus {
  /** Stripe connected account ID. */
  id: string
  /** Whether the account can accept charges. */
  chargesEnabled: boolean
  /** Whether the account can receive payouts. */
  payoutsEnabled: boolean
  /** Whether there are any currently-due requirements (Stripe is blocked on something). */
  requirementsCurrent: boolean
  /** Stripe connected-account type (`standard`, `express`, `custom`), if known. */
  type?: ConnectedAccountType
  /** Currently-due requirement IDs from Stripe (empty when nothing is due). */
  currentlyDue: readonly string[]
}
```

#### `CheckoutSessionResult`

Result of creating or retrieving a checkout session.

```typescript
interface CheckoutSessionResult {
  id: string
  url: string | null
  /** The Stripe Subscription ID created by the checkout session, if available. */
  subscription?: string
}
```

#### `ConnectedAccountBusinessProfile`

Subset of Stripe `business_profile` fields commonly set during marketplace
onboarding.

```typescript
interface ConnectedAccountBusinessProfile {
  name?: string
  url?: string
  productDescription?: string
  supportEmail?: string
  supportPhone?: string
  mcc?: string
}
```

#### `ConnectWebhookEvent`

Normalized Connect webhook event.

Provider-agnostic shape so consumers don't have to import Stripe types
to dispatch on event kind.

```typescript
interface ConnectWebhookEvent {
  /** Recognized Connect event type, or `unknown` for unrelated events. */
  type: ConnectWebhookEventType
  /** Original Stripe event type string (e.g. `account.updated`). */
  rawType: string
  /** The ID of the primary resource this event is about (account, payout, transfer, fee). */
  resourceId?: string
  /** The connected account this event applies to, if Stripe sent one. */
  accountId?: string
  /** Raw event-data object (plain JSON shape — never the live Stripe object). */
  data: Record<string, unknown>
}
```

#### `CreateAccountLinkParams`

Parameters for creating an account link.

```typescript
interface CreateAccountLinkParams {
  /** Stripe connected account ID (`acct_...`). */
  accountId: string
  /** URL Stripe redirects the user back to after onboarding completes. */
  returnUrl: string
  /** URL Stripe redirects the user to if the link expires before completion. */
  refreshUrl: string
  /** Whether this is a first-time onboarding link or an update link. */
  type: AccountLinkType
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}
```

#### `CreateAccountLinkResult`

Result of creating an account link.

```typescript
interface CreateAccountLinkResult {
  /** Hosted onboarding URL the connected account holder should open. */
  url: string
  /** Unix timestamp (seconds) when the link expires. */
  expiresAt: number
}
```

#### `CreateConnectedAccountParams`

Parameters for creating a connected account.

```typescript
interface CreateConnectedAccountParams {
  /** Stripe account type — `standard`, `express`, or `custom`. */
  type: ConnectedAccountType
  /** Two-letter ISO country code for the account holder (e.g. `US`, `GB`). */
  country: string
  /** Email address of the account holder. */
  email: string
  /** Optional business profile fields (display name, website, MCC, etc.). */
  businessProfile?: ConnectedAccountBusinessProfile
  /** Optional metadata to attach to the connected account. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}
```

#### `CreateConnectedAccountResult`

Result of creating a connected account.

```typescript
interface CreateConnectedAccountResult {
  /** Stripe connected account ID (`acct_...`). */
  id: string
  /** Optional onboarding URL (only present when an account link is created in the same flow). */
  accountLinkUrl?: string
}
```

#### `CreatePayoutParams`

Parameters for creating a payout from a connected account's Stripe balance to its bank account.

```typescript
interface CreatePayoutParams {
  /** Connected account ID to issue the payout from (`acct_...`). */
  accountId: string
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number
  /** Three-letter ISO currency code, lowercase (e.g. `usd`). */
  currency: string
  /** Optional payout method — `standard` or `instant`. */
  method?: 'standard' | 'instant'
  /** Optional metadata. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}
```

#### `CreatePayoutResult`

Result of creating a payout.

```typescript
interface CreatePayoutResult {
  /** Stripe payout ID (`po_...`). */
  id: string
  /** Amount paid out (smallest currency unit). */
  amount: number
  /** Three-letter ISO currency code. */
  currency: string
  /** Payout status (e.g. `pending`, `paid`, `failed`). */
  status: string
  /** Estimated arrival date (Unix timestamp in seconds). */
  arrivalDate: number
}
```

#### `CreateTransferParams`

Parameters for creating a transfer to a connected account.

```typescript
interface CreateTransferParams {
  /** Amount in the smallest currency unit (e.g. cents for USD). */
  amount: number
  /** Three-letter ISO currency code, lowercase (e.g. `usd`). */
  currency: string
  /** Destination connected account ID (`acct_...`). */
  destination: string
  /** Optional source charge to attach the transfer to (for separate-charges-and-transfers flow). */
  sourceTransaction?: string
  /** Optional transfer group string (groups related transfers/charges together). */
  transferGroup?: string
  /** Optional metadata. */
  metadata?: Record<string, string>
  /** Optional idempotency key for safe retries. */
  idempotencyKey?: string
}
```

#### `CreateTransferResult`

Result of creating a transfer.

```typescript
interface CreateTransferResult {
  /** Stripe transfer ID (`tr_...`). */
  id: string
  /** Amount transferred (smallest currency unit). */
  amount: number
  /** Three-letter ISO currency code. */
  currency: string
  /** Destination connected account ID. */
  destination: string
  /** Transfer group, if set. */
  transferGroup?: string
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
  /**
   * The Stripe Customer ID (`cus_...`) that owns this subscription. Used to bind
   * a verified subscription to the calling user so a foreign subscription id
   * cannot be claimed (ownership check in `verifyPayment`).
   */
  customer?: string
  items: { data: Array<{ id: string; price?: { id?: string; product?: string } }> }
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

#### `AccountLinkType`

Account-link types — onboarding (first-time) vs update (returning).

```typescript
type AccountLinkType = 'account_onboarding' | 'account_update'
```

#### `ConnectedAccountType`

Connected account type.

Stripe distinguishes three account types with different
onboarding / dashboard responsibilities. See
https://stripe.com/docs/connect/accounts.

```typescript
type ConnectedAccountType = 'standard' | 'express' | 'custom'
```

#### `ConnectWebhookEventType`

Connect webhook event types this provider knows how to interpret.

`unknown` is returned for any other Stripe event so callers can fall
through to the standard subscription webhook handler if needed.

```typescript
type ConnectWebhookEventType =
  | 'account.updated'
  | 'payout.created'
  | 'transfer.created'
  | 'application_fee.refunded'
  | 'unknown'
```

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

#### `createAccountLink(params)`

Creates a Stripe account link the connected account holder uses to finish
onboarding (or to update payout details).

```typescript
function createAccountLink(params: CreateAccountLinkParams): Promise<CreateAccountLinkResult>
```

- `params` — Account-link creation parameters.

**Returns:** The hosted onboarding/update URL and its expiry (Unix timestamp, seconds).

#### `createCheckoutSession(options)`

Creates a Stripe Checkout session for a new subscription.

```typescript
function createCheckoutSession(options: { priceId: string; successUrl: string; cancelUrl: string; customerId?: string; metadata?: Record<string, string>; idempotencyKey?: string; }): Promise<CheckoutSessionResult>
```

- `options` — Checkout configuration.
- `options.priceId` — The Stripe Price ID for the subscription line item.
- `options.successUrl` — URL to redirect to after successful payment.
- `options.cancelUrl` — URL to redirect to if the user cancels.
- `options.customerId` — Optional existing Stripe Customer ID.
- `options.metadata` — Optional key-value metadata to attach to the session.
- `options.idempotencyKey` — Optional idempotency key for safe request retries.

**Returns:** The checkout session ID and URL.

#### `createConnectedAccount(params)`

Creates a Stripe connected account for a marketplace seller / driver / provider.

```typescript
function createConnectedAccount(params: CreateConnectedAccountParams): Promise<CreateConnectedAccountResult>
```

- `params` — Connected-account creation parameters.

**Returns:** The new account ID.

#### `createPayout(params)`

Issues a payout from a connected account's Stripe balance to its bank account.

Uses Stripe's `Stripe-Account` header to scope the call to the connected account.

```typescript
function createPayout(params: CreatePayoutParams): Promise<CreatePayoutResult>
```

- `params` — Payout parameters.

**Returns:** The created payout.

#### `createSetupIntent(options)`

Creates a Stripe SetupIntent for the saved-card flow.

If `customerId` is not provided, a new Stripe customer is created and its
ID is returned alongside the SetupIntent so the resource layer can persist
the customer ID for future SetupIntents and detachments.

```typescript
function createSetupIntent(options: { customerId?: string; metadata?: Record<string, string>; idempotencyKey?: string; }): Promise<{ id: string; clientSecret: string; customerId: string; }>
```

- `options` — SetupIntent creation options.
- `options.customerId` — Optional existing Stripe customer ID (`cus_...`).
- `options.metadata` — Optional metadata to attach to the SetupIntent.
- `options.idempotencyKey` — Optional idempotency key for safe retries.

**Returns:** The SetupIntent ID, client secret, and customer ID.

#### `createTransfer(params)`

Transfers funds from the platform balance to a connected account.

```typescript
function createTransfer(params: CreateTransferParams): Promise<CreateTransferResult>
```

- `params` — Transfer parameters.

**Returns:** The created transfer.

#### `detachPaymentMethod(paymentMethodId)`

Detaches a saved Stripe payment method from its customer.

```typescript
function detachPaymentMethod(paymentMethodId: string): Promise<boolean>
```

- `paymentMethodId` — The Stripe payment method ID (`pm_...`).

**Returns:** `true` if Stripe acknowledged the detach, `false` otherwise.

#### `getAccountStatus(accountId)`

Looks up a connected account's onboarding / payout status.

```typescript
function getAccountStatus(accountId: string): Promise<AccountStatus>
```

- `accountId` — Stripe connected account ID (`acct_...`).

**Returns:** Normalized account status.

#### `getCheckoutSession(sessionId)`

Retrieves a Stripe Checkout session by ID, including the associated subscription.

```typescript
function getCheckoutSession(sessionId: string): Promise<CheckoutSessionResult>
```

- `sessionId` — The Stripe Checkout session ID.

**Returns:** The session ID, URL, and subscription ID (if a subscription was created).

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

#### `normalizeSubscriptionStatus(rawStatus)`

Maps a raw Stripe subscription status string (e.g. `past_due`, `incomplete`)
to the provider-agnostic `SubscriptionStatus`.

Shared between `normalizeSubscription` (verify path) and the webhook adapter so
both paths derive status identically.

```typescript
function normalizeSubscriptionStatus(rawStatus: string | undefined): SubscriptionStatus
```

- `rawStatus` — The raw Stripe `status` string, or `undefined` if absent.

**Returns:** The normalized `SubscriptionStatus` (`'unknown'` for unrecognized/missing).

#### `processConnectWebhook(headers, body)`

Verifies and normalizes a Stripe Connect webhook event.

Reuses the same `STRIPE_WEBHOOK_SECRET` env var as the standard webhook
pipeline (and the same signature verification logic) — Connect events
arrive on the same webhook endpoint when the platform's webhook is
configured to receive Connect events.

```typescript
function processConnectWebhook(headers: Record<string, string | string[] | undefined>, body: string | Buffer<ArrayBufferLike>): ConnectWebhookEvent
```

- `headers` — Request headers (looks up `stripe-signature`).
- `body` — The raw request body (string or Buffer).

**Returns:** The verified, normalized Connect webhook event.

#### `reportUsageOverage(options)`

Reports a usage-based OVERAGE charge to Stripe as a one-off invoice item
against an existing customer (and, when given, attached to the open invoice
of a specific subscription so it lands on the next cycle invoice).

This is the supported, type-safe path on the installed Stripe SDK (v22):
the legacy `subscriptionItems.createUsageRecord` API was removed in favor of
metered-price meter events / invoice items. A positive-amount invoice item
is the simplest cost-plus overage mechanism — Stripe aggregates open invoice
items and bills them at the customer's cycle close, so repeated incremental
calls accrete onto the same upcoming invoice.

IDEMPOTENCY: the caller MUST pass a stable `idempotencyKey` derived from
`(user, period, amount)` so a retry or a double-run within the same Stripe
idempotency window (24h) is collapsed to a single invoice item and never
double-charges (broker safety invariant 4).

This function performs NO gating of its own — it charges whatever it is
told to. The decision of WHETHER to charge (configured? opted-in? paid?
over budget?) lives entirely in the molecule-dev billing module, which is
the single inert/opt-in gate (safety invariants 1 + 2).

```typescript
function reportUsageOverage(options: { customerId: string; amountCents: number; currency?: string; priceId: string; subscriptionId?: string; description?: string; metadata?: Record<string, string>; idempotencyKey: string; }): Promise<{ id: string; amountCents: number; }>
```

- `options` — Overage reporting options.
- `options.customerId` — The Stripe customer to bill (`cus_...`).
- `options.amountCents` — The overage amount in cents (must be `> 0`).
- `options.currency` — ISO currency (defaults to `usd`).
- `options.priceId` — The metered/overage Price id this reports against;
- `options.subscriptionId` — Optional subscription to attach the item to
- `options.description` — Human-readable line description.
- `options.metadata` — Extra reconciliation metadata (e.g. period).
- `options.idempotencyKey` — REQUIRED stable key (see IDEMPOTENCY above).

**Returns:** The created invoice item id + the amount actually reported.

#### `retrievePaymentMethod(paymentMethodId)`

Retrieves a saved Stripe payment method (card) and returns normalized metadata.

```typescript
function retrievePaymentMethod(paymentMethodId: string): Promise<{ id: string; brand: string; last4: string; expMonth: number; expYear: number; } | null>
```

- `paymentMethodId` — The Stripe payment method ID (`pm_...`).

**Returns:** Brand, last4, and expiry, or `null` if the lookup fails.

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

#### `stripeSecretDefinitions`

Secret definitions required by the Stripe payments bond.

```typescript
const stripeSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-payments` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-jwt` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `STRIPE_SECRET_KEY` *(required)* — Stripe secret key
  - Setup: Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.
  - Get it here: [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
  - Example: `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` *(required)* — Stripe webhook signing secret
  - Setup: Stripe Dashboard → Developers → Webhooks → Add endpoint pointing at {apiUrl}/api/users/payment-notification/stripe, then copy its signing secret.
  - Get it here: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
  - Example: `whsec_...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-jwt`
- `@molecule/api-payments`
- `@molecule/api-secrets`
- `stripe`

Bond this as the payments provider so `@molecule/api-payments`'s `verifySubscription` (and
the payment resource) work server-side — don't call the Stripe SDK directly for
verification. Env: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` are SERVER-ONLY; only the
publishable key (`pk_…`) is client-side.

**You do NOT need molecule's Express app, the `bond()` wiring, or the UI packages to use
this — the functions below are framework-agnostic.** On a non-Express / non-molecule host
(Next.js App Router, serverless functions, Hono, Fastify), import them and call them from
your OWN route handlers:
`import { createCheckoutSession, verifyWebhookSignature, getSubscription } from '@molecule/api-payments-stripe'`.
They cover the whole flow — {@link createCheckoutSession} (server-owned `priceId`, so you
never take a price/amount from the client), {@link verifyWebhookSignature}, and the
subscription getters/updaters — and carry the security contract (config-not-configured
errors, normalized status) for free, so reach for these instead of hand-rolling raw
`stripe` calls. In a Next.js App Router route, read the RAW webhook body with
`await req.text()` and the header with `req.headers.get('stripe-signature')`, then
`verifyWebhookSignature(rawBody, signature)` (the `express.raw(...)` note below is the
Express-host equivalent). Only `@molecule/api-middleware-billing-routes` (Express glue) and
`@molecule/app-billing-react` (molecule UI) are framework-coupled — skip THOSE on such a
host, but still use these bond functions underneath.

Two things a weak Stripe integration gets wrong:

- **The webhook body MUST be RAW for signature verification.** {@link verifyWebhookSignature}
  (Stripe's `constructEvent`) hashes the exact bytes, so a parsed-then-re-serialized body
  ALWAYS fails. In a molecule app you need NO special middleware: the always-included
  `@molecule/api-middleware-body-parser-express` already captures the unparsed body as
  `req.rawBody` (a string) on EVERY request — just pass `req.rawBody` + the `stripe-signature`
  header to {@link verifyWebhookSignature}. Do NOT add a route-specific `express.raw(...)` here —
  it is redundant and fights the global JSON parser (which has already consumed the stream and
  set `req.rawBody`). (ONLY on a NON-molecule Express host that lacks `req.rawBody` do you mount
  `express.raw({ type: 'application/json' })` before the JSON parser; on Next.js App Router read
  the raw body with `await req.text()`.) NEVER act on an unverified webhook body — it is
  attacker-controlled.
- **Webhooks are redelivered — be idempotent.** Stripe retries until it gets a 2xx, so the
  same `event.id` can arrive twice. Dedupe on it (the payment record's
  `UNIQUE(platformKey, transactionId)` already blocks a double-grant), and return 2xx once
  handled so Stripe stops retrying.

Create checkout with SERVER-configured price ids ({@link createCheckoutSession}) — never an
amount sent by the client.

**A missing `STRIPE_SECRET_KEY` is NOT the same as "no active subscription."**
`getClient()` throws a tagged config-not-configured error; `verifySubscription`,
`updateSubscription`, and `cancelSubscription` on {@link paymentProvider} detect
that tag (`isConfigNotConfiguredError` from `@molecule/api-payments`) and
RETHROW it instead of swallowing it into the same `null` / `{ updated: false }`
/ `false` a genuine verification/update failure returns — so a caller (or its
own catch block) can tell "the operator forgot to set the secret" apart from
"this subscription/card is invalid" and surface the actionable 503 instead of
a generic 400/500.

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

Translation strings are provided by `@molecule/api-locales-payments-stripe`.
