# @molecule/app-order-timeline-react

Order / shipment progress timeline.

Exports `<OrderTimeline>` and `OrderMilestone` type.

## Quick Start

```tsx
import { OrderTimeline, OrderMilestone } from '@molecule/app-order-timeline-react'

const milestones: OrderMilestone[] = [
  { id: 'placed', label: 'Order placed', completed: true },
  { id: 'shipped', label: 'Shipped', completed: true, detail: 'Jun 3 via FedEx' },
  { id: 'delivery', label: 'Out for delivery', current: true },
  { id: 'delivered', label: 'Delivered' },
]

<OrderTimeline milestones={milestones} eta="Estimated arrival: today by 8 pm" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-order-timeline-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `OrderMilestone`

A single step in an order or shipment progress timeline.

```typescript
interface OrderMilestone {
  id: string
  /** Display label ("Placed", "Shipped", "Delivered"). */
  label: ReactNode
  /** Optional description / timestamp / location. */
  detail?: ReactNode
  /** Is this milestone completed? */
  completed?: boolean
  /** Is this the current (in-progress) milestone? */
  current?: boolean
}
```

### Functions

#### `OrderTimeline(root0, root0, root0, root0, root0)`

Order / shipment progress timeline — typical e-commerce flow:
"Placed → Confirmed → Shipped → Out for delivery → Delivered".

Different from `<Stepper>` in two ways:
- Focuses on milestones (with optional per-step detail) rather than
  multi-page wizard steps.
- Horizontal layout is responsive with connector lines between nodes.

```typescript
function OrderTimeline({
  milestones,
  eta,
  orientation = 'horizontal',
  className,
}: OrderTimelineProps): JSX.Element
```

- `root0` — *
- `root0` — .milestones
- `root0` — .eta
- `root0` — .orientation
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
