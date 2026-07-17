# @molecule/app-billing-react

React pricing page + checkout flow for the molecule.dev billing kit.

Components:
  `<PricingPage />` — public pricing table that fetches `/api/billing/tiers`
  and posts to `/api/billing/checkout` when the user clicks Upgrade.

  `<BillingStatusBadge />` — compact account-page status display that
  shows the current tier and offers a cancel-subscription button.

  `<LimitsList>` / `<LimitsItem>` — building blocks for the
  `renderLimits` prop: a stacked checklist row with check / dash icon,
  e.g. `renderLimits={(l) => (
    <LimitsList>
      <LimitsItem>{l.maxAccounts} accounts</LimitsItem>
      <LimitsItem included={l.canExport}>Data export</LimitsItem>
    </LimitsList>
  )}`

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
npm install @molecule/app-billing-react @molecule/app-http @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `BillingStatusBadgeProps`

Props for `<BillingStatusBadge />`.

```typescript
interface BillingStatusBadgeProps {
  /**
   * Optional callback invoked after a successful cancel. Most apps will
   * navigate the user back to settings or refresh the page from here.
   */
  onCanceled?: () => void

  /** Optional className applied to the outer wrapper. */
  className?: string

  /**
   * Whether to render the cancel-subscription button when the user is
   * on a paid tier. Defaults to `true`.
   */
  showCancel?: boolean
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

#### `LimitsItemProps`

Props for `<LimitsItem>`.

```typescript
interface LimitsItemProps {
  /** Row content (typically a translated label + number). */
  children: ReactNode
  /**
   * Whether this feature is included in the tier. When `false`, the row
   * renders with a muted line-through and a dash glyph instead of the
   * check icon. Defaults to `true`.
   */
  included?: boolean
}
```

#### `PricingPageProps`

Props for `<PricingPage />`.

```typescript
interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional billing-period selector. Defaults to `'month'`. Pass `'year'`
   * to render the yearly column. The component falls back to whatever the
   * tier provides when the requested period is missing.
   */
  period?: PricingTierPrice['period']

  /**
   * Optional render function for the tier-specific limits column. Defaults
   * to a stacked checklist rendering numeric / boolean values with a green
   * check glyph. Apps with rich limit shapes can supply a custom renderer.
   */
  renderLimits?: (limits: TLimits) => React.ReactNode

  /**
   * Optional override for the page-level heading translation key.
   * Defaults to `'billing.pricing.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. Defaults to `'Choose your plan'`. */
  headingDefault?: string

  /**
   * Optional sub-heading shown under the page heading. Pass `null` to
   * suppress. Defaults to a translated "Pick the plan that fits…" line.
   */
  subheadingKey?: string | null
  /** English fallback for the sub-heading. */
  subheadingDefault?: string

  /**
   * Optional className applied to the outer wrapper, useful when embedding
   * the page in an existing layout.
   */
  className?: string

  /**
   * Path the browser is sent to when an anonymous visitor clicks a paid
   * tier's upgrade CTA. Defaults to `/login`. Set to `null` to disable
   * the redirect (e.g. when the app handles the auth gate at a higher
   * level via routing guards).
   */
  unauthenticatedRedirect?: string | null

  /**
   * Optional tier key to highlight as "most popular" — receives the
   * elevated card variant, a popular-badge in the header, and a
   * primary-tone CTA. When omitted (default), the highest-priced tier
   * with a real stripePriceId for the selected period is auto-selected.
   * Pass `null` to disable highlighting entirely.
   */
  popularTierKey?: string | null

  /**
   * Optional font-family stack applied inline to the page heading,
   * tier names, and hero price. Defaults to a system-serif cascade
   * (Georgia, Iowan Old Style, …) matching the flagship-app
   * convention. Pass `null` to disable inline font and inherit from
   * the theme.
   */
  headlineFontFamily?: string | null
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

#### `BillingStatusBadge(props)`

Compact billing-status display for the user's account/settings page.
Shows the current tier name and offers a cancel button on paid tiers.

```typescript
function BillingStatusBadge(props: BillingStatusBadgeProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `props` — Component props.

**Returns:** The rendered status badge.

#### `LimitsItem(props)`

Single row in a tier's feature list — a check (or em-dash) icon
followed by the row label. Use inside `<LimitsList>`.

```typescript
function LimitsItem({ children, included = true }: LimitsItemProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

#### `LimitsList(props)`

Container for a tier's feature list. Apps use this in their
`renderLimits` prop with `<LimitsItem>` children to get the polished
stacked-checklist layout (check icon prefix, muted/primary colors,
spacing) that matches the rest of `<PricingPage />`.

```typescript
function LimitsList({ children }: { children: ReactNode; }): ReactElement<unknown, string | JSXElementConstructor<any>>
```

#### `PricingPage(props)`

Renders the public pricing page. Fetches `/api/billing/tiers` on mount
and lays out one card per tier with the price for the selected period
and a CTA that starts a Stripe Checkout session via
`/api/billing/checkout`. Tiers without a Stripe priceId (e.g. the free
tier or local-dev) render a disabled CTA so users still see the row.

The highest-priced paid tier is highlighted as "most popular" by
default — the card uses the elevated variant, the header carries a
star badge, and its CTA renders in the primary color. Apps that want
a different tier in the spotlight can pass `popularTierKey` (or
`null` to suppress).

```typescript
function PricingPage(props: PricingPageProps<TLimits>): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see `PricingPageProps`).

**Returns:** The rendered pricing page.

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

### Runtime Dependencies

- `@molecule/app-http`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

**Name collision:** `PricingPage` is also exported by
`@molecule/app-pricing-page-react` (a tier-card grid with a monthly/yearly
toggle driven by `usePricingTiers()`). THIS package's `<PricingPage>` is the
entitlements-kit table with a `renderLimits` prop + compound
`<LimitsList>`/`<LimitsItem>` and a built-in `<BillingStatusBadge>` — import
from `@molecule/app-billing-react` when you are wiring
`@molecule/api-entitlements`. If you import both packages, alias one to avoid
the clash.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The pricing route renders every tier from `/api/billing/tiers` with name,
  price, and per-tier limits — no empty table, no `undefined` cells.
- [ ] The signed-in user's CURRENT tier is visibly marked (highlighted / "current
  plan") and its Upgrade button is disabled or absent.
- [ ] Clicking Upgrade on another tier posts to `/api/billing/checkout` and the
  page follows the returned checkout handoff (button is not a dead click).
- [ ] `<BillingStatusBadge />` on the account screen shows the live tier, and its
  cancel action updates the shown status after confirmation.
- [ ] A signed-out visitor can still view the public pricing table.
- [ ] If the tiers endpoint fails, the page shows a visible error state — not a
  blank page or spinner forever.

## Translations

Translation strings are provided by `@molecule/app-locales-billing`.
