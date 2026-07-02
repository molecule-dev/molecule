# @molecule/api-billing-routes

Drop-in `/billing/*` Express routes + `defineTiers()` helper for molecule.dev.

Replaces the near-identical `routes/billing.ts` boilerplate every paid
flagship currently ships. Wires to `@molecule/api-payments-stripe` (or any
compatible `PaymentProvider` + `createPortalSession`) via the bond system.

## Quick Start

```typescript
import { createBillingRoutes, defineTiers } from '@molecule/api-billing-routes'

const tiers = defineTiers([
  { id: 'free', name: 'Free', features: ['Up to 5 projects'], priceMonthly: 0 },
  {
    id: 'pro_monthly',
    name: 'Pro (Monthly)',
    features: ['Unlimited projects', 'Priority support'],
    priceMonthly: 1200,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
  },
])

app.use('/billing', createBillingRoutes({ tiers }))
```

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-billing-routes @molecule/api-bond @molecule/api-payments
```

## API

### Interfaces

#### `BillingErrorBody`

Shape of a serializable error response from the billing routes.

```typescript
interface BillingErrorBody {
  /** Stable, machine-readable error code. */
  code: string
  /** English fallback message. Apps may localize via response interceptors. */
  message: string
}
```

#### `BillingProvider`

Provider methods consumed by the billing routes. This is a structural
superset of `PaymentProvider` — any provider that supplies these methods
is compatible. The Stripe bond satisfies `cancelSubscription` and (via
`updateSubscription`) checkout-session creation directly. Portal session
creation is optional; if omitted, `POST /billing/portal` returns 501.

```typescript
interface BillingProvider extends PaymentProvider {
  /**
   * Creates a customer-portal session. Optional — Stripe-style providers
   * typically expose this; receipt-based providers (Apple/Google) do not.
   */
  createPortalSession?(params: {
    userId: string
    returnUrl?: string
  }): Promise<PortalSessionResult | null>
}
```

#### `BillingRoutesOptions`

Options accepted by `createBillingRoutes()`.

```typescript
interface BillingRoutesOptions<
  TLimits extends Record<string, unknown> = Record<string, unknown>,
> {
  /** The tier accessors returned by `defineTiers()`. */
  tiers: TierAccessors<TLimits>
  /**
   * Optional injected provider — if omitted, the routes look up
   * `bond('payments', providerName)`.
   */
  provider?: BillingProvider
  /**
   * Bonded provider name. Defaults to `'stripe'`.
   */
  providerName?: string
  /**
   * Resolves the authenticated user ID from a request. Defaults to reading
   * `res.locals.session.userId` (Express convention).
   */
  resolveUserId?: AuthResolver
  /**
   * Optional override for `SubscriptionUpdateResult` shape used in tests.
   * @internal
   */
  __subscriptionUpdateResult?: SubscriptionUpdateResult
}
```

#### `PortalSessionResult`

Result of creating a Stripe-style customer-portal session.

```typescript
interface PortalSessionResult {
  /** The portal session ID. */
  id: string
  /** The URL to redirect the user to. */
  url: string
}
```

#### `TierAccessors`

Accessors returned by `defineTiers()`. These are pure (no side effects) and
typed against the same `TLimits` parameter as the input.

```typescript
interface TierAccessors<TLimits extends Record<string, unknown> = Record<string, unknown>> {
  /** Returns the full list of tiers in the order they were declared. */
  getPricingTiers(): ReadonlyArray<TierDef<TLimits>>
  /** Returns the tier whose `id` matches, or `undefined`. */
  getTierById(id: string): TierDef<TLimits> | undefined
  /** Returns the tier whose `id` matches; throws if not found. */
  requireTier(id: string): TierDef<TLimits>
  /**
   * Returns `true` iff `tierId` is the same tier as `minimumId` or appears
   * after it in the declaration order. Useful for capability gates like
   * `tierAtLeast(currentId, 'pro_monthly')`.
   */
  tierAtLeast(tierId: string, minimumId: string): boolean
}
```

#### `TierDef`

A tier definition supplied to `defineTiers()`. Each tier represents a single
pricing plan (free, pro monthly, pro yearly, team, etc.).

```typescript
interface TierDef<TLimits extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable identifier for the tier (e.g. `'free'`, `'pro_monthly'`). */
  id: string
  /** Human-readable label (e.g. `'Pro (Monthly)'`). Not localized — display layer applies i18n. */
  name: string
  /** Optional monthly price in the smallest currency unit (e.g. cents). `0` means free. */
  priceMonthly?: number
  /** Optional yearly price in the smallest currency unit (e.g. cents). */
  priceYearly?: number
  /** Marketing feature bullet keys/strings. The display layer applies i18n. */
  features: string[]
  /** Optional structured limits enforced at the application layer. */
  limits?: TLimits
  /** Optional Stripe Price ID — the value passed to `createCheckoutSession`. */
  stripePriceId?: string
}
```

### Types

#### `AuthResolver`

Result of resolving the authenticated user from a request.

```typescript
type AuthResolver = (req: unknown, res: unknown) => string | null | Promise<string | null>
```

### Functions

#### `createBillingRoutes(options)`

Creates a drop-in Express `Router` exposing the standard billing routes.

Mounted routes:
- `POST /checkout` — body `{ priceId: string }`. Calls
  `provider.updateSubscription({ userId, newProductId: priceId })`. Returns
  `{ checkoutUrl }` for new subscriptions or `{ updated, subscription }`
  for in-place plan changes.
- `POST /cancel` — no body. Calls `provider.cancelSubscription({ userId })`
  and returns `{ canceled: true }` on success.
- `POST /portal` — body `{ returnUrl?: string }`. Calls
  `provider.createPortalSession({ userId, returnUrl })` and returns
  `{ url }`. Returns 501 if the bonded provider does not implement portal
  sessions.

The router is NOT mounted under any prefix — callers wire it via
`app.use('/billing', createBillingRoutes(...))`.

```typescript
function createBillingRoutes(options: BillingRoutesOptions<TLimits>): ExpressRouter
```

- `options` — Tier accessors plus optional provider/auth overrides.

**Returns:** An Express `Router` ready to be mounted.

#### `defineTiers(tiers)`

Builds a `TierAccessors` object from an ordered list of tier definitions.

Validates that the list is non-empty and that all `id` values are unique.
The declaration order of the array IS the upgrade order — `tierAtLeast`
uses index comparison, so list cheaper tiers first.

```typescript
function defineTiers(tiers: readonly TierDef<TLimits>[]): TierAccessors<TLimits>
```

- `tiers` — Ordered list of tier definitions, cheapest → most expensive.

**Returns:** Read-only accessors keyed off the supplied tier ids.

### Constants

#### `billingRoutesSecretDefinitions`

Secret definitions required by the billing routes middleware.

```typescript
const billingRoutesSecretDefinitions: SecretDefinition[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-secrets` ^1.0.0
- `express` ^4.0.0 || ^5.0.0

### Environment Variables

- `STRIPE_SECRET_KEY` *(required)* — Stripe secret key
  - Setup: Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.
  - Get it here: [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
  - Example: `sk_test_...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-payments`

- The package looks up `bond('payments', 'stripe')` by default; pass
  `provider` or `providerName` to override.
- Error responses use the `BillingErrorBody` shape (`{ code, message }`) —
  apps may layer i18n on top via response interceptors.
