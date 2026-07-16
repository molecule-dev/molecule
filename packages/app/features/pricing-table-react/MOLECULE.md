# @molecule/app-pricing-table-react

Side-by-side pricing comparison table.

Exports `<PricingTable>` and `PricingPlan` / `PricingFeature` types.

## Quick Start

```tsx
import { PricingTable } from '@molecule/app-pricing-table-react'

const checkout = (planId: string): void => {
  window.location.assign(`/checkout?plan=${planId}`)
}

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
npm install @molecule/app-pricing-table-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `PricingTableProps`

Props for {@link PricingTable}.

```typescript
interface PricingTableProps {
  plans: PricingPlan[]
  features: PricingFeature[]
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `PricingTable(props)`

Side-by-side pricing comparison — features × plans matrix. A header
row holds plan cards (name, price, CTA); body rows show per-feature
availability (`true` → ✓, `false` → —, strings/nodes pass through).
The wrapper scrolls horizontally when columns overflow.

```typescript
function PricingTable({ plans, features, className }: PricingTableProps): ReactNode
```

- `props` — Component props (see {@link PricingTableProps}).

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

All text arrives via props — pass pre-translated strings; requires a wired
ClassMap bond.
