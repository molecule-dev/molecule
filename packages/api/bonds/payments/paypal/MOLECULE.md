# @molecule/api-payments-paypal

PayPal payment provider for molecule.dev.

Bond this as the payments provider so `@molecule/api-payments`'s `verifySubscription` (and
the payment resource) work server-side with PayPal — don't hand-roll `fetch` calls to
PayPal for verification. Env: `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` are SERVER-ONLY;
`PAYPAL_BASE_URL` defaults to the sandbox host, `PAYPAL_WEBHOOK_ID` is required only for
webhook handling.

## Quick Start

```ts
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-paypal'

// Named bond, mirroring the stripe convention: bond('payments', '<name>', provider).
bond('payments', 'paypal', paymentProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-paypal @molecule/api-bond @molecule/api-payments @molecule/api-secrets
```

## API

### Interfaces

#### `CheckoutSessionResult`

Result of creating a billing subscription or a checkout order: the
resource id plus the buyer-facing approval URL (the checkout redirect).

```typescript
interface CheckoutSessionResult {
  id: string
  /** The PayPal approval link the buyer is redirected to (the checkout URL). */
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

#### `PayPalLink`

An HATEOAS link PayPal returns on created/retrieved resources.

```typescript
interface PayPalLink {
  href: string
  rel: string
  method?: string
}
```

#### `PayPalOrder`

A PayPal v2 Checkout Order (`/v2/checkout/orders`).

```typescript
interface PayPalOrder {
  id: string
  /** Raw PayPal status: `CREATED` | `SAVED` | `APPROVED` | `VOIDED` | `COMPLETED` | `PAYER_ACTION_REQUIRED`. */
  status: string
  intent?: string
  create_time?: string
  payer?: {
    payer_id?: string
    email_address?: string
  }
  purchase_units?: Array<{
    reference_id?: string
    custom_id?: string
    amount?: { currency_code?: string; value?: string }
    payments?: {
      captures?: Array<{
        id?: string
        status?: string
        create_time?: string
        amount?: { currency_code?: string; value?: string }
      }>
    }
  }>
  links?: PayPalLink[]
}
```

#### `PayPalPlan`

A PayPal Billing Plan (`/v1/billing/plans`). Plans are the PRICE-level
object apps configure in their plan catalogue (`P-...` ids) — the direct
analog of a Stripe Price.

```typescript
interface PayPalPlan {
  id: string
  /** The parent catalog product id — the analog of a Stripe Product. */
  product_id: string
  name?: string
  status?: string
  description?: string
  billing_cycles?: Array<{
    frequency?: { interval_unit?: string; interval_count?: number }
    tenure_type?: string
    sequence?: number
    total_cycles?: number
    pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } }
  }>
}
```

#### `PayPalSubscription`

A PayPal Billing Subscription (`/v1/billing/subscriptions`, `I-...` ids).

```typescript
interface PayPalSubscription {
  id: string
  /**
   * Raw PayPal status: `APPROVAL_PENDING` | `APPROVED` | `ACTIVE` |
   * `SUSPENDED` | `CANCELLED` | `EXPIRED`.
   */
  status: string
  plan_id: string
  /** Free-form id set at creation (used to carry the molecule user id). */
  custom_id?: string
  start_time?: string
  create_time?: string
  update_time?: string
  status_update_time?: string
  subscriber?: {
    payer_id?: string
    email_address?: string
    name?: { given_name?: string; surname?: string }
  }
  billing_info?: {
    next_billing_time?: string
    last_payment?: { amount?: { value?: string; currency_code?: string }; time?: string }
    failed_payments_count?: number
  }
  links?: PayPalLink[]
}
```

#### `WebhookEventResult`

Result of verifying a PayPal webhook via
`/v1/notifications/verify-webhook-signature` + parsing the event payload.

```typescript
interface WebhookEventResult {
  /** The PayPal event id (`WH-...`), useful for idempotent handling. */
  id?: string
  /** The PayPal event type (e.g. `BILLING.SUBSCRIPTION.ACTIVATED`). */
  type: string
  /** The event's `resource` object (subscription, sale, ...). */
  resource: Record<string, unknown>
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

### Classes

#### `PayPalApiError`

An error returned by the PayPal REST API. Carries the HTTP status and
PayPal's `debug_id` (the value PayPal support asks for) alongside the
provider's own error `name`/`message`.

### Functions

#### `cancelSubscription(subscriptionId, reason)`

Cancels a PayPal billing subscription. Unlike Stripe's
`cancel_at_period_end`, PayPal cancellation is IMMEDIATE — the subscription
terminates at once and the buyer is not refunded for the unused remainder
of the cycle automatically.

```typescript
function cancelSubscription(subscriptionId: string, reason?: string): Promise<boolean>
```

- `subscriptionId` — The subscription id (`I-...`).
- `reason` — Optional cancellation reason shown in PayPal.

**Returns:** `true` when PayPal acknowledged the cancellation.

#### `captureOrder(orderId)`

Captures an APPROVED PayPal order (`/v2/checkout/orders/{id}/capture`),
moving the buyer's approved funds. An order is only capturable after the
buyer has approved it; capturing a `CREATED` order fails with
`UNPROCESSABLE_ENTITY`.

```typescript
function captureOrder(orderId: string): Promise<PayPalOrder>
```

- `orderId` — The order id.

**Returns:** The captured (usually `COMPLETED`) order.

#### `createOrder(options)`

Creates a PayPal v2 checkout order (`/v2/checkout/orders`) for a ONE-TIME
purchase and returns the approval URL. After the buyer approves, PayPal
returns them to `returnUrl` with `?token=<orderId>&PayerID=...` appended;
the order is then captured server-side (see the bond adapter's
`verifySubscription`, which captures an approved order on verify).

```typescript
function createOrder(options: { amount: string; currency?: string; referenceId?: string; returnUrl: string; cancelUrl: string; customId?: string; idempotencyKey?: string; }): Promise<CheckoutSessionResult>
```

- `options` — Order options.
- `options.amount` — The amount as a decimal string (e.g. `'12.00'`).
- `options.currency` — ISO currency code (default `USD`).
- `options.referenceId` — Optional seller reference stored on the purchase unit — carry the plan/product id here so verification can map the order back to your catalogue.
- `options.returnUrl` — URL PayPal returns the buyer to after approval.
- `options.cancelUrl` — URL PayPal returns the buyer to if they abort.
- `options.customId` — Optional free-form id (e.g. the molecule user id).
- `options.idempotencyKey` — Optional `PayPal-Request-Id` for safe retries.

**Returns:** The order id and approval URL.

#### `createPlan(options)`

Creates a PayPal billing plan (`/v1/billing/plans`, `P-...`) — the
PRICE-level object a subscription is started with. A plan MUST exist
before a subscription can be created for it; create plans ahead of time
(dashboard or {@link createProduct} + this) and configure your app's plan
catalogue with the `P-...` ids.

```typescript
function createPlan(options: { productId: string; name: string; interval: "DAY" | "WEEK" | "MONTH" | "YEAR"; price: string; currency?: string; intervalCount?: number; }): Promise<{ id: string; }>
```

- `options` — Plan options.
- `options.productId` — The parent catalog product id (`PROD-...`).
- `options.name` — The plan name.
- `options.interval` — Billing interval unit (`DAY` | `WEEK` | `MONTH` | `YEAR`).
- `options.price` — The per-cycle price as a decimal string (e.g. `'12.00'`).
- `options.currency` — ISO currency code (default `USD`).
- `options.intervalCount` — Interval count (default `1` — e.g. `3` + `MONTH` = quarterly).

**Returns:** The created plan id (`P-...`).

#### `createProduct(options)`

Creates a PayPal catalog product (`/v1/catalogs/products`) — the parent of
every billing plan. Only needed when provisioning plans from code; a plan
created by hand in the dashboard already has one.

```typescript
function createProduct(options: { name: string; description?: string; type?: "PHYSICAL" | "DIGITAL" | "SERVICE"; }): Promise<{ id: string; }>
```

- `options` — Product options.
- `options.name` — The product name (shown on PayPal checkout pages).
- `options.description` — Optional product description.
- `options.type` — `PHYSICAL` | `DIGITAL` | `SERVICE` (default `SERVICE`).

**Returns:** The created product id (`PROD-...`).

#### `createSubscription(options)`

Creates a PayPal billing subscription (`/v1/billing/subscriptions`,
`I-...`) for an EXISTING plan and returns the approval URL — the PayPal
equivalent of a Stripe Checkout session. The buyer is redirected to
`url`; after approving, PayPal returns them to `returnUrl` with
`?subscription_id=I-...&ba_token=...&token=...` appended.

```typescript
function createSubscription(options: { planId: string; returnUrl: string; cancelUrl: string; customId?: string; idempotencyKey?: string; }): Promise<CheckoutSessionResult>
```

- `options` — Subscription options.
- `options.planId` — The billing plan id (`P-...`). Must already exist.
- `options.returnUrl` — URL PayPal returns the buyer to after approval.
- `options.cancelUrl` — URL PayPal returns the buyer to if they abort.
- `options.customId` — Optional free-form id stored on the subscription (used to carry the molecule user id through webhook events).
- `options.idempotencyKey` — Optional `PayPal-Request-Id` for safe retries.

**Returns:** The subscription id and approval URL.

#### `getAccessToken()`

Obtains (and caches) an OAuth2 client-credentials access token.

Reads `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` lazily at CALL time — ESM
import hoisting evaluates this module before app code (dotenv, a secrets
bond, test stubs) runs, so reading env at module load would report "not
configured" despite the keys being set.

```typescript
function getAccessToken(): Promise<string>
```

**Returns:** A bearer token for the configured app.

#### `getBaseUrl()`

Returns the configured PayPal API base URL (`PAYPAL_BASE_URL`), defaulting
to the sandbox host. Trailing slashes are stripped so path joins are stable.

```typescript
function getBaseUrl(): string
```

**Returns:** The base URL with no trailing slash.

#### `getOrder(orderId)`

Retrieves a PayPal v2 checkout order by id.

```typescript
function getOrder(orderId: string): Promise<PayPalOrder>
```

- `orderId` — The order id.

**Returns:** The order object.

#### `getPlan(planId)`

Retrieves a PayPal billing plan by id. Used to resolve a subscription's
`plan_id` to the parent `product_id` for plan-catalogue matching.

```typescript
function getPlan(planId: string): Promise<PayPalPlan>
```

- `planId` — The plan id (`P-...`).

**Returns:** The plan object.

#### `getSubscription(subscriptionId)`

Retrieves a PayPal billing subscription by id.

```typescript
function getSubscription(subscriptionId: string): Promise<PayPalSubscription>
```

- `subscriptionId` — The subscription id (`I-...`).

**Returns:** The subscription object.

#### `normalizeSubscription(subscription, plan)`

Normalizes a PayPal `PayPalSubscription` to the common
`NormalizedSubscription` interface used across all payment providers.

```typescript
function normalizeSubscription(subscription: PayPalSubscription, plan?: PayPalPlan): NormalizedSubscription
```

- `subscription` — The PayPal subscription to normalize.
- `plan` — Optional billing plan (from {@link getPlan}); when provided, `productId` resolves to the plan's parent catalog product id. Without it `productId` falls back to the plan id — the bond adapter always fetches the plan so callers get both identifiers.

**Returns:** A `NormalizedSubscription` with provider-agnostic fields.

#### `normalizeSubscriptionStatus(rawStatus)`

Maps a raw PayPal subscription status string (e.g. `APPROVAL_PENDING`,
`SUSPENDED`) to the provider-agnostic `SubscriptionStatus`.

Shared between `normalizeSubscription` (verify path) and the webhook adapter so
both paths derive status identically. `APPROVED` maps to `pending` on purpose:
the buyer has approved the billing agreement but the first payment is NOT
confirmed yet — granting on `APPROVED` would confer entitlement without a
confirmed payment (the same gate the Google bond's NON_ENTITLED_STATES set
enforces). `SUSPENDED` maps to `past_due` because PayPal suspends
subscriptions on payment failure.

```typescript
function normalizeSubscriptionStatus(rawStatus: string | undefined): SubscriptionStatus
```

- `rawStatus` — The raw PayPal `status` string, or `undefined` if absent.

**Returns:** The normalized `SubscriptionStatus` (`'unknown'` for unrecognized/missing).

#### `reviseSubscription(subscriptionId, planId)`

Revises a PayPal billing subscription to a different plan
(`/v1/billing/subscriptions/{id}/revise`) — the plan-change analog of
updating a Stripe subscription's price. PayPal usually requires the buyer
to RE-APPROVE the revised terms, in which case the response carries an
`approve` link the buyer must be sent through.

```typescript
function reviseSubscription(subscriptionId: string, planId: string): Promise<{ subscription: PayPalSubscription; approveUrl: string | null; }>
```

- `subscriptionId` — The subscription id (`I-...`).
- `planId` — The new billing plan id (`P-...`).

**Returns:** The revised subscription plus the approval URL when re-approval is required.

#### `verifyWebhookSignature(params)`

Verifies a PayPal webhook's authenticity via PayPal's
`/v1/notifications/verify-webhook-signature` endpoint and parses the event
payload. Unlike Stripe (local HMAC), PayPal verification is a server call:
the transmission headers + raw event + your `PAYPAL_WEBHOOK_ID` are posted
back to PayPal, which answers `SUCCESS`/`FAILURE`.

```typescript
function verifyWebhookSignature(params: { authAlgo: string; certUrl: string; transmissionId: string; transmissionSig: string; transmissionTime: string; webhookEvent: Record<string, unknown>; }): Promise<WebhookEventResult | null>
```

- `params` — The webhook verification parameters.
- `params.authAlgo` — The `paypal-auth-algo` header value.
- `params.certUrl` — The `paypal-cert-url` header value.
- `params.transmissionId` — The `paypal-transmission-id` header value.
- `params.transmissionSig` — The `paypal-transmission-sig` header value.
- `params.transmissionTime` — The `paypal-transmission-time` header value.
- `params.webhookEvent` — The parsed JSON event body.

**Returns:** The parsed event (id, type, resource) when verification succeeds, or `null` when PayPal reports `FAILURE`.

### Constants

#### `DEFAULT_BASE_URL`

The default PayPal REST host — the SANDBOX. Live traffic requires opting in
via `PAYPAL_BASE_URL=https://api-m.paypal.com` so a misconfigured deploy
fails safe (test charges) rather than silently billing real buyers.

```typescript
const DEFAULT_BASE_URL: "https://api-m.sandbox.paypal.com"
```

#### `paymentProvider`

PaymentProvider-compatible adapter for PayPal.

Wraps the PayPal REST functions into a `PaymentProvider`-compatible object
for use with the molecule bond system. Supports subscription verification
(billing subscriptions AND one-time orders), webhook handling, plan
upgrades/downgrades, and cancellation.

```typescript
const paymentProvider: PaymentProviderInterface
```

#### `paypalSecretDefinitions`

Secret definitions required by the PayPal payments bond.

```typescript
const paypalSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-payments` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-paypal'

export function setupPaymentsPaypal(): void {
  bond('payments', 'paypal', paymentProvider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `PAYPAL_CLIENT_ID` *(required)* — PayPal REST app client ID
  - Setup: PayPal Developer Dashboard → Apps & Credentials → create (or select) a REST app in the Sandbox or Live tab; copy its Client ID.
  - Get it here: [https://developer.paypal.com/dashboard/applications/sandbox](https://developer.paypal.com/dashboard/applications/sandbox)
  - Example: `AXx...`
- `PAYPAL_CLIENT_SECRET` *(required)* — PayPal REST app secret
  - Setup: PayPal Developer Dashboard → Apps & Credentials → your REST app; copy the Secret (shown under the Client ID).
  - Get it here: [https://developer.paypal.com/dashboard/applications/sandbox](https://developer.paypal.com/dashboard/applications/sandbox)
  - Example: `ELx...`
- `PAYPAL_BASE_URL` *(optional)* — PayPal API base URL
  - Setup: Defaults to the sandbox host (https://api-m.sandbox.paypal.com); set to https://api-m.paypal.com for live. Must match the environment your REST app credentials came from.
  - Example: `https://api-m.sandbox.paypal.com`
- `PAYPAL_WEBHOOK_ID` *(optional)* — PayPal webhook ID
  - Setup: PayPal Developer Dashboard → Apps & Credentials → your REST app → Add Webhook pointing at {apiUrl}/api/users/payment-notification/paypal, then copy its webhook ID. Required only for webhook signature verification.
  - Get it here: [https://developer.paypal.com/dashboard/applications/sandbox](https://developer.paypal.com/dashboard/applications/sandbox)
  - Example: `5WH...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-payments`
- `@molecule/api-secrets`

**You do NOT need molecule's Express app, the `bond()` wiring, or the UI packages to use
this — the functions below are framework-agnostic.** On a non-Express / non-molecule host
(Next.js App Router, serverless functions, Hono, Fastify), import them and call them from
your OWN route handlers:
`import { createSubscription, verifyWebhookSignature, getSubscription } from '@molecule/api-payments-paypal'`.
They cover the whole flow — {@link createSubscription} / {@link createOrder} (server-owned
plan/amount, so you never take a price from the client), {@link verifyWebhookSignature},
and the subscription/order getters — and carry the security contract (config-not-configured
errors, normalized status) for free, so reach for these instead of hand-rolling raw PayPal
calls.

PayPal-specific things a weak integration gets wrong:

- **A billing plan must EXIST before a subscription can be created.** Subscriptions are
  started with a plan id (`P-...`) — create the plan first (PayPal Developer Dashboard →
  your app → Subscriptions, or {@link createProduct} + {@link createPlan} from code) and
  configure your app's plan catalogue with the `P-...` ids. Creating a subscription for a
  nonexistent plan fails with `RESOURCE_NOT_FOUND`.
- **Sandbox and live are different hosts AND different credentials.** The bond defaults to
  the sandbox (`https://api-m.sandbox.paypal.com`); set `PAYPAL_BASE_URL=https://api-m.paypal.com`
  for live. The client id/secret must come from the SAME environment tab (Sandbox/Live) in
  the developer dashboard — a sandbox secret against the live host fails OAuth with a 401.
- **Webhook verification is a SERVER CALL, not a local HMAC.** {@link verifyWebhookSignature}
  posts the transmission headers + event + your `PAYPAL_WEBHOOK_ID` back to PayPal's
  `/v1/notifications/verify-webhook-signature`, which answers `SUCCESS`/`FAILURE`. Register
  your webhook in the dashboard pointing at `{apiUrl}/api/users/payment-notification/paypal`
  and copy its webhook id into `PAYPAL_WEBHOOK_ID`. NEVER act on an unverified webhook body
  — it is attacker-controlled. Redeliveries happen — be idempotent and return 2xx once handled.
- **After buyer approval PayPal appends its OWN query params to your `return_url`** —
  `?subscription_id=I-...&ba_token=...&token=...` for subscriptions and `?token=<orderId>&PayerID=...`
  for orders — so read `subscription_id`/`token`, not just a `subscriptionId` you may have
  expected. (The molecule user resource's verify-payment handler accepts all three.)
- **A subscription is only entitled when `ACTIVE`.** `APPROVAL_PENDING`/`APPROVED` mean the
  buyer approved the billing agreement but no payment is confirmed yet — granting there
  confers entitlement without payment. After approval PayPal flips the subscription to
  `ACTIVE` within seconds; have the frontend retry verification briefly rather than
  lowering the gate.
- **Cancellation is IMMEDIATE.** PayPal has no `cancel_at_period_end`:
  `cancelSubscription` terminates the subscription at once and does not refund the unused
  remainder of the cycle automatically.
- **One-time orders are captured on verify.** `verifySubscription(orderId)` captures an
  `APPROVED` order and only grants on `COMPLETED`; a `CREATED` order was never
  buyer-approved and always fails verification.

**A missing `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` is NOT the same as "no active
subscription."** `getAccessToken()` throws a tagged config-not-configured error;
`verifySubscription`, `updateSubscription`, and `cancelSubscription` on
{@link paymentProvider} detect that tag (`isConfigNotConfiguredError` from
`@molecule/api-payments`) and RETHROW it instead of swallowing it into the same
`null` / `{ updated: false }` / `false` a genuine verification/update failure returns —
so a caller can tell "the operator forgot to set the secret" apart from "this
subscription is invalid" and surface the actionable 503 instead of a generic 400/500.

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
