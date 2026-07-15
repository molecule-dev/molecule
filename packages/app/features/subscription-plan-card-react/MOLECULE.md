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
npm install @molecule/app-subscription-plan-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `SubscriptionPlanCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Pricing / subscription plan card. Renders header (badge + name +
description), price + interval, feature checklist, and a primary
CTA (button or link).

```typescript
function SubscriptionPlanCard({
  name,
  description,
  price,
  interval,
  features,
  ctaLabel,
  onCta,
  ctaHref,
  recommended,
  badge,
  className,
}: SubscriptionPlanCardProps): JSX.Element
```

- `root0` — *
- `root0` — .name
- `root0` — .description
- `root0` — .price
- `root0` — .interval
- `root0` — .features
- `root0` — .ctaLabel
- `root0` — .onCta
- `root0` — .ctaHref
- `root0` — .recommended
- `root0` — .badge
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
