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
`@molecule/app-locales-pricing-page`. The Stripe checkout
transport lives in `@molecule/app-billing-react`.

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
npm install @molecule/app-pricing-page-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-billing-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-subscription-plan-card-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-pricing-page`.
