# @molecule/api-billing-routes

Drop-in `/billing/*` Express routes + `defineTiers()` helper for molecule.dev.

Serves the COMPLETE `/billing/*` contract `@molecule/app-billing-react`
consumes — `GET /tiers`, `GET /status`, `POST /checkout`, `POST /cancel`
(plus an optional `POST /portal`) — so `<PricingPage />`,
`<BillingStatusBadge />`, `usePricingTiers()`, and `useBillingStatus()` work
against it with no gaps. Replaces the near-identical `routes/billing.ts`
boilerplate every paid flagship ships. Wires to `@molecule/api-payments-stripe`
(or any compatible `PaymentProvider` + `createPortalSession`) via the bond system.

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

// Mount under /api/billing so the app-side fetches to /api/billing/* line up.
app.use('/api/billing', createBillingRoutes({ tiers }))
```

## Type
`middleware`

## Installation
```bash
npm install @molecule/api-billing-routes @molecule/api-bond @molecule/api-payments @molecule/api-secrets express
npm install -D @types/express
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
   * Optional override that returns the public pricing table in the frontend's
   * `PricingTierEntry` shape. When omitted, `GET /tiers` derives one entry per
   * configured `TierDef`. Supply this to serve a richer catalogue (multiple
   * period variants per tier, `savings` tags, `perSeat`) — it is also the hook
   * `@molecule/api-bonds-default-express` uses to delegate its `/tiers` here.
   */
  getPricingTiers?: () => ReadonlyArray<PricingTierEntry<TLimits>>
  /**
   * Optional formatter turning a `TierDef` price (smallest currency unit) into
   * the display string `GET /tiers` emits. Defaults to a USD formatter
   * (`$12/mo`, `$120/yr`, `$0`). Only used by the derive path — ignored when
   * `getPricingTiers` is supplied.
   */
  formatPrice?: PriceFormatter
  /**
   * Resolves the authenticated user's current billing status for `GET /status`.
   * Injectable so the routes stay decoupled from any specific entitlements
   * store. When omitted (or when it returns `null`), `GET /status` returns the
   * default (first / free) tier snapshot for any authenticated user.
   */
  resolveStatus?: BillingStatusResolver<TLimits>
  /**
   * Optional override for `SubscriptionUpdateResult` shape used in tests.
   * @internal
   */
  __subscriptionUpdateResult?: SubscriptionUpdateResult
}
```

#### `BillingStatusResponse`

Snapshot of the signed-in user's current billing state, returned by
`GET /status`.

Mirrors `@molecule/app-billing-react`'s `BillingStatus` — the same shape
`@molecule/api-bonds-default-express`'s `createBillingRouter` emits from
`@molecule/api-entitlements`'s `getEffectiveTier`, so the two are drop-in
interchangeable for the frontend.

```typescript
interface BillingStatusResponse<TLimits = unknown> {
  /** The user's `users.planKey` (`'free'`, `'stripeMonthly'`, etc.). */
  planKey: string
  /** Tier category — `'free'`, `'pro'`, `'team'`, or any app-defined extension. */
  category: string
  /** Display name (matches the active tier's `PricingTierEntry.name`). */
  name: string
  /** Tier-specific limits the user is currently entitled to. */
  limits: TLimits
  /** True when the user is on the default (free) tier. */
  isFree: boolean
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

#### `PricingPrice`

One billing-period price row in the public pricing table.

Mirrors `@molecule/app-billing-react`'s `PricingTierPrice` — the shape the
`<PricingPage />` / `usePricingTiers()` frontend consumes verbatim. Kept as a
local re-declaration because API packages must not import `@molecule/app-*`
(cross-stack boundary), so the contract is asserted structurally on both sides.

```typescript
interface PricingPrice {
  /** Billing cadence. */
  period: 'month' | 'year'
  /** Display string (e.g. `'$19/mo'`, `'$190/yr'`, `'$0'`). */
  price: string
  /**
   * Stripe Price ID used as the checkout line item. `null` for the free tier
   * (and during local dev when the price-id env vars are unset).
   */
  stripePriceId: string | null
  /** Optional savings tag on yearly variants (e.g. `'2 months free'`). */
  savings?: string
}
```

#### `PricingTierEntry`

One row of the public pricing table returned by `GET /tiers`.

Mirrors `@molecule/app-billing-react`'s `PricingTierEntry`. When the derive
path is used, each `TierDef` maps to exactly one entry with a single price
(the `TierDef` model treats each billing period as its own tier). Supply
`getPricingTiers` in the options to serve a richer catalogue instead.

```typescript
interface PricingTierEntry<TLimits = unknown> {
  /** Stable slug used as the row key (matches the source `TierDef.id`). */
  key: string
  /** Display name shown in the page heading and CTA. */
  name: string
  /** Price variants for the tier. Presentation order. */
  prices: PricingPrice[]
  /** Tier-specific limits rendered on the comparison row. */
  limits: TLimits
  /** Whether the tier is billed per seat (rendered as a footnote). */
  perSeat?: boolean
}
```

#### `PricingTiersResponse`

Response envelope for `GET /tiers`.

Mirrors `@molecule/app-billing-react`'s `PricingTiersResponse` — the frontend
reads `data` directly, so the envelope key must be `data`.

```typescript
interface PricingTiersResponse<TLimits = unknown> {
  /** Tiers ordered as declared (typically free → pro → team). */
  data: PricingTierEntry<TLimits>[]
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

#### `BillingStatusResolver`

Resolves the authenticated user's current billing status for `GET /status`.

Kept injectable so this package stays decoupled from any specific
entitlements / tier store: flagship apps pass a resolver backed by
`@molecule/api-entitlements`'s `getEffectiveTier`. Returning `null` (or not
supplying a resolver at all) makes `GET /status` fall back to the default
(first / free) tier snapshot derived from the configured tiers.

```typescript
type BillingStatusResolver<TLimits = unknown> = (
  userId: string,
  req: unknown,
  res: unknown,
) => BillingStatusResponse<TLimits> | null | Promise<BillingStatusResponse<TLimits> | null>
```

#### `PriceFormatter`

Formats a price expressed in the smallest currency unit (e.g. cents) into
the display string `GET /tiers` emits for a `PricingPrice`.

```typescript
type PriceFormatter = (amountMinor: number, period: 'month' | 'year') => string
```

### Functions

#### `createBillingRoutes(options)`

Creates a drop-in Express `Router` exposing the standard billing routes —
the exact `/billing/*` contract `@molecule/app-billing-react`
(`usePricingTiers` / `useBillingStatus` / `<PricingPage />` /
`<BillingStatusBadge />`) consumes.

Mounted routes:
- `GET /tiers` — public pricing table. Returns
  `{ data: PricingTierEntry[] }`. Derives one entry per configured `TierDef`
  by default, or serves `options.getPricingTiers()` verbatim when supplied.
  No auth.
- `GET /status` — the signed-in user's current tier snapshot
  `{ planKey, category, name, limits, isFree }`. Returns 401 when
  unauthenticated. Uses `options.resolveStatus` when supplied; otherwise
  returns the default (first / free) tier snapshot.
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

The router is NOT mounted under any prefix — callers wire it under `/billing`
so the app-facing paths are `/api/billing/*`, e.g.
`app.use('/api/billing', createBillingRoutes(...))`. (The scaffolded Vite dev
proxy forwards `/api` without rewriting, so the mount must include it.)

```typescript
function createBillingRoutes(options: BillingRoutesOptions<TLimits>): ExpressRouter
```

- `options` — Tier accessors plus optional provider/auth/pricing/status overrides.

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
- `STRIPE_PRICE_PRO_MONTHLY` *(optional)* — Stripe price ID (Pro monthly)
  - Setup: Stripe Dashboard > Products > your Pro product > Add price (recurring monthly); copy the price_... ID.
  - Get it here: [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
  - Example: `price_...`
- `STRIPE_PRICE_PRO_YEARLY` *(optional)* — Stripe price ID (Pro yearly)
  - Setup: Stripe Dashboard > Products > your Pro product > Add price (recurring yearly); copy the price_... ID.
  - Get it here: [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
  - Example: `price_...`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-payments`
- `@molecule/api-secrets`
- `express`

- The package looks up `bond('payments', 'stripe')` by default; pass
  `provider` or `providerName` to override.
- Routes served: `GET /tiers`, `GET /status`, `POST /checkout`,
  `POST /cancel`, `POST /portal`. `GET /tiers` returns
  `{ data: PricingTierEntry[] }` — derived one-per-`TierDef` by default, or
  `options.getPricingTiers()` verbatim for a richer catalogue. `GET /status`
  returns `{ planKey, category, name, limits, isFree }` — pass
  `options.resolveStatus` (e.g. backed by `@molecule/api-entitlements`'s
  `getEffectiveTier`) to report the user's real plan; without it the default
  free-tier snapshot is returned for any authenticated user.
- Mount so the resulting app-facing paths are `/api/billing/...` — the
  scaffolded Vite dev proxy forwards `/api` WITHOUT rewriting.
- Naming: `@molecule/api-entitlements` exports a DIFFERENT `defineTiers`
  (registry-object signature). Do not mix the two in one file without
  aliasing.
- Error responses use the `BillingErrorBody` shape (`{ code, message }`) —
  apps may layer i18n on top via response interceptors.
