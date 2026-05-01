# @molecule/app-billing-react

React pricing page + checkout flow for the molecule.dev billing kit.

Components:
  `<PricingPage />` — public pricing table that fetches `/api/billing/tiers`
  and posts to `/api/billing/checkout` when the user clicks Upgrade.

  `<BillingStatusBadge />` — compact account-page status display that
  shows the current tier and offers a cancel-subscription button.

Hooks:
  `usePricingTiers<TLimits>()`        → `UseHttpResult<PricingTiersResponse<TLimits>>`
  `useBillingStatus<TLimits>()`       → `UseHttpResult<BillingStatus<TLimits>>`
  `useStartCheckout()`                → `{ data, loading, error, start(priceId) }`
  `useCancelSubscription()`           → `{ data, loading, error, cancel() }`

The API side of this kit lives in `@molecule/api-entitlements` +
`@molecule/api-payments-stripe`. Wire those into your project (any
mlcl flagship template that includes `@molecule/api-entitlements`
already exposes the `/api/billing/*` routes), then drop `<PricingPage />`
onto a `/pricing` route.

## Quick Start

```tsx
import { PricingPage } from '@molecule/app-billing-react'
import type { PersonalFinanceLimits } from '../tiers'

const Pricing = () => (
  <PricingPage<PersonalFinanceLimits>
    period="month"
    renderLimits={(l) => (
      <ul>
        <li>{l.maxAccounts} accounts</li>
        <li>{l.maxTransactionsPerMonth} transactions / month</li>
      </ul>
    )}
  />
)
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-billing-react
```

## API

### Interfaces

#### `BillingActionState`

Async-state shape returned by `useStartCheckout` / `useCancelSubscription`.

```typescript
interface BillingActionState<T> {
  /** The most recent response from the action, or `null` before the first call. */
  data: T | null

  /** True while a request is in flight. */
  loading: boolean

  /** Last error thrown by the action, or `null` on success. */
  error: Error | null
}
```

#### `BillingStatus`

Snapshot of the signed-in user's current billing state. Returned by
`GET /api/billing/status` once the user is authenticated.

```typescript
interface BillingStatus<TLimits = unknown> {
  /** The user's `users.planKey` (`'free'`, `'stripeMonthly'`, etc.). */
  planKey: string

  /** Tier category — `'free'`, `'pro'`, `'team'`, or any app-defined extension. */
  category: string

  /** Display name (matches `PricingTierEntry.name` for the active tier). */
  name: string

  /** Tier-specific limits the user is currently entitled to. */
  limits: TLimits

  /** True when the user is on the registry default (free) tier. */
  isFree: boolean
}
```

#### `CancelResponse`

Response from `POST /api/billing/cancel`.

```typescript
interface CancelResponse {
  /** True when the cancellation request was accepted. */
  canceled?: boolean

  /** Localized error message when cancellation failed. */
  error?: string
}
```

#### `CheckoutResponse`

Response from `POST /api/billing/checkout`. Either `checkoutUrl` or `updated` is set.

```typescript
interface CheckoutResponse {
  /** Stripe Checkout URL — set when the user has no active subscription yet. */
  checkoutUrl?: string

  /** True when the user already had a subscription that was updated in place. */
  updated?: boolean

  /** Updated subscription metadata (only when `updated === true`). */
  subscription?: {
    expiresAt?: string
    autoRenews?: boolean
  }
}
```

#### `PricingTierEntry`

One row of the public pricing table. Apps can declare any number of
`period` variants per tier (typically a `month` and `year` pair).

```typescript
interface PricingTierEntry<TLimits = unknown> {
  /** Stable slug used as a row key (`'free'`, `'pro'`, `'team'`). */
  key: string

  /** Display name shown in the page heading and CTA. */
  name: string

  /** Price variants for the tier. Order is presentation order. */
  prices: PricingTierPrice[]

  /** Tier-specific limits — render any/all of these on the comparison row. */
  limits: TLimits

  /** Whether the tier is billed per seat (rendered as a footnote). */
  perSeat?: boolean
}
```

#### `PricingTierPrice`

One billing period offered for a tier — typically `month` or `year` —
with the human-readable price string and the Stripe price ID. The price
ID may be `null` for the free tier (no Stripe product).

```typescript
interface PricingTierPrice {
  /** Billing cadence. */
  period: 'month' | 'year'

  /** Display string (e.g. `'$19/mo'`, `'$190/yr'`, `'$0'`). */
  price: string

  /**
   * Stripe Price ID used as the line item when the user clicks Upgrade.
   * `null` for free tiers and during local dev when env vars are unset.
   */
  stripePriceId: string | null

  /** Optional savings tag on yearly variants (e.g. `'2 months free'`). */
  savings?: string
}
```

#### `PricingTiersResponse`

Response envelope for `GET /api/billing/tiers`.

```typescript
interface PricingTiersResponse<TLimits = unknown> {
  /** Tiers ordered as the API returns them (typically free → pro → team). */
  data: PricingTierEntry<TLimits>[]
}
```

### Functions

#### `useBillingStatus()`

Fetch the signed-in user's current subscription state once on mount.
Returns 401 from the API when the user is not authenticated; consumers
should treat the absence of `data` as "anonymous → free tier".

```typescript
function useBillingStatus(): UseHttpResult<BillingStatus<TLimits>>
```

**Returns:** Async-state for the user's billing status.

#### `useCancelSubscription()`

Cancel the user's active subscription at the end of the current
billing period. Returns the response from the bonded payment provider.

```typescript
function useCancelSubscription(): BillingActionState<CancelResponse> & { cancel: () => Promise<CancelResponse | null>; }
```

**Returns:** Async-state plus a `cancel` function.

#### `usePricingTiers()`

Fetch the public pricing data once on mount. Useful inside a
pricing/upgrade page where the tiers are needed before render.

```typescript
function usePricingTiers(): UseHttpResult<PricingTiersResponse<TLimits>>
```

**Returns:** Async-state for the pricing tiers response.

#### `useStartCheckout()`

Start a Stripe Checkout session for a given Stripe price ID. The
returned `start(priceId)` posts to `/api/billing/checkout`; the
response is either `{ checkoutUrl }` (for new subscribers — redirect
the browser) or `{ updated: true }` (for existing subscribers —
refresh the page).

```typescript
function useStartCheckout(): BillingActionState<CheckoutResponse> & { start: (priceId: string) => Promise<CheckoutResponse | null>; }
```

**Returns:** Async-state plus a `start` function.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-http` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
