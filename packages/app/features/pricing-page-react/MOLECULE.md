# @molecule/app-pricing-page-react

Drop-in pricing page used by every paid molecule.dev flagship app.

Components:
  `<PricingPage />`      — Renders one card per tier, with optional
                           monthly/yearly toggle and Stripe Checkout
                           CTA. Reads tiers from `usePricingTiers()`
                           unless an explicit `tiers` prop is passed.

  `<PlanUpdatedPage />`  — Post-checkout success page rendered at
                           Stripe's `success_url` redirect target.

Translations live in the companion locale bond
`@molecule/app-locales-pricing-page`. The checkout transport lives in
`@molecule/app-billing-react` (`usePricingTiers()` calls
`GET /api/billing/tiers`; `useStartCheckout()` posts to
`/api/billing/checkout`) — your API must serve those routes and the HTTP
client must be wired. NOTE: `@molecule/app-billing-react` also exports its
own different `PricingPage` (compound LimitsList/LimitsItem layout); import
from the package whose API you are using. The default checkout redirects
with `window.location.assign(checkoutUrl)` — pass `onCheckout` to route
through an SPA router or a non-Stripe flow. `<PlanUpdatedPage />` here is
the pricing-page-flavored success page; a standalone alternative is
`@molecule/app-plan-updated-page-react`.

## Quick Start

```tsx
import { PricingPage } from '@molecule/app-pricing-page-react'
import { addTranslations } from '@molecule/app-i18n'
import { en } from '@molecule/app-locales-pricing-page'

addTranslations('en', en)

const Pricing = () => <PricingPage />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pricing-page-react @molecule/app-billing-react @molecule/app-react @molecule/app-subscription-plan-card-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `PlanUpdatedPageProps`

Props for `<PlanUpdatedPage />`.

```typescript
interface PlanUpdatedPageProps {
  /**
   * Optional new plan name to include in the heading (e.g. `'Pro'`).
   * When omitted, a generic heading is rendered.
   */
  planName?: string

  /**
   * Optional CTA label / target. Renders a primary button when both
   * `ctaLabel` and one of `onCta` / `ctaHref` are supplied. A typical
   * use is "Continue to dashboard".
   */
  ctaLabel?: ReactNode

  /** Click handler for the CTA. Mutually exclusive with `ctaHref`. */
  onCta?: () => void

  /** Anchor target for the CTA. Mutually exclusive with `onCta`. */
  ctaHref?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}
```

#### `PricingPageProps`

Props for `<PricingPage />`.

```typescript
interface PricingPageProps<TLimits = unknown> {
  /**
   * Optional pre-fetched tiers. When omitted the component fetches them
   * via `usePricingTiers()` (which calls `GET /api/billing/tiers`).
   */
  tiers?: PricingTierEntry<TLimits>[]

  /**
   * Optional override for the checkout handler. The default posts to
   * `/api/billing/checkout` via `useStartCheckout()` and redirects the
   * browser to the returned `checkoutUrl`. Custom apps can pass a
   * function that performs Stripe checkout via a different transport,
   * navigates within a router, etc.
   */
  onCheckout?: (tier: PricingTierEntry<TLimits>, price: PricingTierPrice) => void | Promise<void>

  /** When true (default), renders a monthly/yearly toggle. */
  showPeriodToggle?: boolean

  /** Default billing period for the toggle. Defaults to `'month'`. */
  defaultPeriod?: PricingPagePeriod

  /**
   * Optional render function for the tier-specific limits block. When
   * omitted, `limits` are rendered as a `<dl>` of key-value pairs.
   */
  renderLimits?: (limits: TLimits) => ReactNode

  /**
   * Optional translation key for the page heading. Defaults to
   * `'pricingPage.heading'`.
   */
  headingKey?: string

  /** Optional English fallback for the heading. */
  headingDefault?: string

  /** Optional className applied to the outer wrapper. */
  className?: string
}
```

### Types

#### `PricingPagePeriod`

Billing period selector — currently `'month'` or `'year'`. Mirrors the
upstream `PricingTierPrice['period']` literal for type-safety.

```typescript
type PricingPagePeriod = PricingTierPrice['period']
```

### Functions

#### `PlanUpdatedPage(props)`

Post-checkout success page. Rendered after Stripe redirects the user
back from Checkout (the standard `success_url` route in mlcl
flagship apps). All copy is i18n-driven so apps can localise the
heading without overriding the component.

```typescript
function PlanUpdatedPage(props: PlanUpdatedPageProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see `PlanUpdatedPageProps`).

**Returns:** The rendered success page.

#### `PricingPage(props)`

Drop-in pricing page. Renders one card per tier from `tiers` (or
`usePricingTiers()` if not supplied), with an optional monthly /
yearly toggle and a Stripe Checkout CTA per card.

```typescript
function PricingPage(props: PricingPageProps<TLimits>): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see `PricingPageProps`).

**Returns:** The rendered pricing page.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-billing-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-subscription-plan-card-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-billing-react`
- `@molecule/app-react`
- `@molecule/app-subscription-plan-card-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-pricing-page`.
