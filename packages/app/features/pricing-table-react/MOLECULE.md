# @molecule/app-pricing-table-react

Side-by-side pricing comparison table.

Exports `<PricingTable>` and `PricingPlan` / `PricingFeature` types.

## Quick Start

```tsx
import { PricingTable } from '@molecule/app-pricing-table-react'

<PricingTable
  plans={[
    { id: 'starter', name: 'Starter', price: '$9', interval: '/mo',
      cta: { label: 'Get started', onClick: () => checkout('starter') } },
    { id: 'pro', name: 'Pro', price: '$29', interval: '/mo', recommended: true,
      cta: { label: 'Get started', onClick: () => checkout('pro') } },
  ]}
  features={[
    { label: 'Projects', values: { starter: '3', pro: 'Unlimited' } },
    { label: 'Team members', values: { starter: false, pro: true } },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pricing-table-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
