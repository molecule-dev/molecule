# @molecule/app-status-timeline-react

Vertical ordered-step status timeline.

Exports `<StatusTimeline>` — render a list of steps with colored dots
indicating reached state and bolded label on the current step. Generic
for orders, workflows, kanban progressions, etc.

## Quick Start

```tsx
import { StatusTimeline } from '@molecule/app-status-timeline-react'

<StatusTimeline
  steps={[
    { key: 'placed', label: 'Order Placed' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
  ]}
  currentKey="shipped"
  ariaLabel="Order status"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-status-timeline-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
