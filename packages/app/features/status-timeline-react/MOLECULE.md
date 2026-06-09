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

## API

### Interfaces

#### `StatusTimelineProps`

Props for the StatusTimeline component.

```typescript
interface StatusTimelineProps {
  /** Ordered list of steps from earliest to latest. */
  steps: ReadonlyArray<StatusTimelineStep>
  /** The key of the current step. Steps with the same or earlier index are shown as "reached". */
  currentKey: string
  /** Aria-label for the timeline ordered list. */
  ariaLabel?: string
  /** Extra classes on the outer `<ol>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `StatusTimelineStep`

A single step entry in a StatusTimeline.

```typescript
interface StatusTimelineStep {
  /** Stable identifier for this step (used as the React key). */
  key: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}
```

### Functions

#### `StatusTimeline(root0, root0, root0, root0, root0, root0)`

Vertical ordered-step status timeline.

Each step renders as a colored dot + label. Steps at or before the
current one are "reached" (filled dot); the current step's label is
bolded; steps after the current one are dimmed via `cm.textMuted`.

```typescript
function StatusTimeline({
  steps,
  currentKey,
  ariaLabel,
  className,
  dataMolId,
}: StatusTimelineProps): JSX.Element
```

- `root0` — *
- `root0` — .steps
- `root0` — .currentKey
- `root0` — .ariaLabel
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
