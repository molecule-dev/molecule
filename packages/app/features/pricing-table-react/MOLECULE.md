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

## API

### Interfaces

#### `PricingFeature`

Describes a single feature row and its per-plan values in the pricing table.

```typescript
interface PricingFeature {
  /** Row label. */
  label: ReactNode
  /** Per-plan-id values: `true` / `false` / a string / a node. */
  values: Record<string, boolean | string | ReactNode>
  /** Optional category / group heading rendered above this row. */
  groupHeading?: ReactNode
}
```

#### `PricingPlan`

Describes a single plan column in the pricing table.

```typescript
interface PricingPlan {
  id: string
  name: ReactNode
  description?: ReactNode
  price: ReactNode
  interval?: ReactNode
  /** CTA renders as primary button on this column. */
  cta?: { label: ReactNode; onClick?: () => void; href?: string }
  /** Visually emphasise as recommended / featured. */
  recommended?: boolean
}
```

### Functions

#### `PricingTable(root0, root0, root0, root0)`

Side-by-side pricing comparison — features × plans matrix. Sticky
header row holds plan names, prices, and CTAs; following rows show
per-feature availability.

```typescript
function PricingTable({ plans, features, className }: PricingTableProps): ReactNode
```

- `root0` — *
- `root0` — .plans
- `root0` — .features
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
