# @molecule/app-subscription-plan-card-react

Pricing / subscription plan card.

Exports `<SubscriptionPlanCard>`.

## Quick Start

```tsx
import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-react'

<SubscriptionPlanCard
  name="Pro"
  price="$19"
  interval="/month"
  features={['Unlimited projects', '10 GB storage', 'Priority support']}
  ctaLabel="Get started"
  onCta={() => router.push('/checkout/pro')}
  recommended
  badge="Most popular"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-subscription-plan-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
