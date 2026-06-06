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
npm install @molecule/app-order-timeline-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
