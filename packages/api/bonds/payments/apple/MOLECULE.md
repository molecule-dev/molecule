# @molecule/api-payments-apple

Apple In-App Purchase provider for molecule.dev.

Handles verification of Apple App Store receipts for in-app purchases and subscriptions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-payments-apple @molecule/api-bond @molecule/api-config @molecule/api-http @molecule/api-payments @molecule/api-secrets
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
  /**
   * The base64-encoded latest receipt. Present in `unified_receipt` of Apple
   * server-to-server (v1) notifications; re-submitted to `verifyReceipt` so the
   * notification's authenticity is proven against Apple before any entitlement
   * is granted (never trust the raw notification body).
   */
  latest_receipt?: string
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

#### `decodeAndVerifyJWS(compactJWS, trustedRootDER)`

Decodes and cryptographically verifies a compact-serialization JWS whose
header carries an `x5c` certificate chain, per RFC 7515 + RFC 7517 §4.7.

FAILS CLOSED — throws (never silently returns unverified data) when:
- the JWS isn't well-formed (not exactly 3 `.`-separated parts, bad base64/JSON)
- the header `alg` isn't `ES256` (the only algorithm Apple uses for this
  scheme — refusing every other value blocks an "alg confusion" downgrade)
- the `x5c` chain is missing or empty
- any certificate in the chain is expired or not yet valid
- the chain's signatures don't actually chain (`x5c[i]` must verify against
  `x5c[i + 1]`'s public key — a signature check, not just a name match)
- the chain doesn't terminate at `trustedRootDER` (the last `x5c` entry must
  either equal the trusted root byte-for-byte, or be signed by it)
- the JWS signature itself doesn't verify against the leaf certificate's
  public key

A forged payload cannot produce an `x5c` chain that both (a) has internally
consistent signatures and (b) terminates at the hardcoded trusted root — an
attacker does not hold Apple's root/intermediate private keys, so every
check above is load-bearing, not defense-in-depth theater.

```typescript
function decodeAndVerifyJWS(compactJWS: string, trustedRootDER: Buffer<ArrayBufferLike>): Record<string, unknown>
```

- `compactJWS` — The `header.payload.signature` JWS compact string.
- `trustedRootDER` — The DER bytes of the CA the chain must terminate at

**Returns:** The decoded JSON payload — ONLY returned once every check above passes.

#### `describeAppleStatus(status)`

Maps Apple's documented `verifyReceipt` status codes to actionable descriptions.

Apple reports failures as bare numeric statuses (e.g. `21004`), and a raw
"status 21004" log is ambiguous between a bad receipt and a server-side
misconfiguration — 21004 actually means the `APPLE_SHARED_SECRET` env var is
missing or wrong, which is an operator fix, not a client bug. Surfacing the
meaning next to the number keeps a failed verification debuggable from the log
line alone.

```typescript
function describeAppleStatus(status: number): string
```

- `status` — The numeric `status` from Apple's verifyReceipt response.

**Returns:** A human-readable explanation of the status (with the fix when it is a config issue).

#### `getAutoRenewStatus(response, originalTransactionId)`

Reads the auto-renew flag for a subscription out of a receipt response's
`pending_renewal_info` — the ONLY field Apple uses to report whether
auto-renew is currently on, independent of whether the subscription is
still paid-through (`cancellation_date` unset) or not.

```typescript
function getAutoRenewStatus(response: VerifyReceiptResponse, originalTransactionId: string): boolean | undefined
```

- `response` — The Apple receipt verification response containing `pending_renewal_info`.
- `originalTransactionId` — The original transaction ID to match in the renewal info array.

**Returns:** `true` if auto-renew is on, `false` if off, or `undefined` if no matching renewal info found (e.g. the response has no `pending_renewal_info` at all).

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

#### `normalizeSubscription(subscription, renewalResponse)`

Normalizes an Apple in-app purchase entry to the provider-agnostic `NormalizedSubscription` interface.
Maps Apple-specific fields (`expires_date_ms`, `is_trial_period`, `cancellation_date`) to standard status values.

```typescript
function normalizeSubscription(subscription: InAppPurchase, renewalResponse?: VerifyReceiptResponse): NormalizedSubscription
```

- `subscription` — The Apple in-app purchase entry to normalize.
- `renewalResponse` — Optional: the full receipt response `subscription` was extracted from

**Returns:** A `NormalizedSubscription` with provider set to `'apple'` and dates converted to millisecond timestamps.

#### `parseV2Notification(signedPayload)`

Parses and authenticates an Apple App Store Server Notifications V2
`signedPayload`.

```typescript
function parseV2Notification(signedPayload: string): ParsedNotification | null
```

- `signedPayload` — The raw `signedPayload` JWS string from the notification body.

**Returns:** The parsed notification, or `null` if it cannot be authenticated or carries no actionable entitlement change (e.g. a `TEST` notification).

#### `verifyReceipt(receiptData, useSandbox)`

Verifies an App Store receipt.

```typescript
function verifyReceipt(receiptData: string, useSandbox?: boolean): Promise<VerifyReceiptResponse>
```

- `receiptData` — Base64-encoded receipt data from the App Store client.
- `useSandbox` — When `true`, sends directly to the sandbox endpoint. When the production endpoint returns status 21007 (a sandbox receipt), it retries against sandbox ONLY if `APPLE_ALLOW_SANDBOX_RECEIPTS=true`; otherwise the sandbox receipt is rejected (fail-closed default).

**Returns:** The parsed receipt verification response from Apple.

### Constants

#### `APPLE_ROOT_CA_G3_DER`

DER bytes of Apple's Root CA - G3 certificate — the trust anchor
{@link decodeAndVerifyJWS} pins App Store Server Notifications V2 JWS
chains to.

```typescript
const APPLE_ROOT_CA_G3_DER: Buffer<ArrayBufferLike>
```

#### `paymentProvider`

PaymentProvider-compatible adapter for Apple In-App Purchases.

Implements `verifyReceipt` and `parseNotification` from the PaymentProvider interface.

```typescript
const paymentProvider: PaymentProviderInterface
```

#### `paymentsAppleSecretDefinitions`

Secret definitions required by the Apple payments bond.

```typescript
const paymentsAppleSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-payments` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-apple'

export function setupPaymentsApple(): void {
  bond('payments', 'apple', paymentProvider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-config` ^1.0.0
- `@molecule/api-http` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `APPLE_SHARED_SECRET` *(required)* — Apple app-specific shared secret
  - Setup: App Store Connect → your app → App Information → App-Specific Shared Secret (for receipt validation).
  - Get it here: [https://appstoreconnect.apple.com/](https://appstoreconnect.apple.com/)

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-config`
- `@molecule/api-http`
- `@molecule/api-payments`
- `@molecule/api-secrets`

Scope limits to know BEFORE wiring this bond:

- **Subscriptions only.** Verification looks for the latest entry with an
  `expires_date_ms`, so a valid ONE-TIME (consumable/non-consumable) purchase
  receipt verifies with Apple but yields `null` ("no subscription found") —
  one-time IAP is not implemented.
- **Both v1 and v2 server notifications are supported.** `parseNotification`
  authenticates v1 notifications (`notification_type` at the body root) by
  re-verifying the embedded receipt with Apple; it authenticates v2
  notifications (`signedPayload` JWS, no top-level `notification_type`) by
  cryptographically verifying the JWS `x5c` certificate chain against
  Apple's Root CA - G3 (see `jws.ts` / `appleRootCertificate.ts`) — NO live
  call back to Apple, which is Apple's own documented model for v2 (the
  signature chain IS the proof). App Store Connect defaults NEW apps to v2;
  both are handled the same way downstream (mapped to the same simplified
  event vocabulary), so no notification-version configuration is required.
- Verification uses Apple's legacy `verifyReceipt` endpoint with
  `APPLE_SHARED_SECRET` for the CLIENT-DRIVEN verify flow
  (`verifyReceipt`/`verifyPayment`) — this is unrelated to which
  notification version App Store Connect sends. Non-zero Apple statuses are
  logged with their meaning (see `describeAppleStatus`) — status 21004
  means the shared secret is missing/wrong (an env fix, not a client bug).
  A missing `APPLE_SHARED_SECRET` throws a tagged config-not-configured
  error (`isConfigNotConfiguredError` from `@molecule/api-payments`) BEFORE
  any network call, and `verifyReceipt` on {@link paymentProvider} rethrows
  it rather than swallowing it into the same `null` a genuinely bad receipt
  returns.
- Sandbox receipts are rejected by default (fail-closed); opt in with
  `APPLE_ALLOW_SANDBOX_RECEIPTS=true` for local/CI testing only.
- `normalizeSubscription()`'s `willRenew` is INFERRED (`isActive &&
  !cancellation_date`) unless you pass the receipt response as its second
  argument, in which case it reads the ACTUAL auto-renew flag from
  `pending_renewal_info` — a still-active subscriber who turned auto-renew
  OFF mid-period has no `cancellation_date` yet, so the inferred value
  alone reports `willRenew: true` right up until expiry.

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
