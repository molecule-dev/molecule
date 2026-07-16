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
npm install @molecule/app-status-timeline-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
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

#### `StatusTimeline(props)`

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

- `props` — Component props (see {@link StatusTimelineProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

- Requires a wired ClassMap bond (`getClassMap()` throws before
  bonding). No i18n dependency — pass pre-translated `label` strings
  and a translated `ariaLabel`.
- If `currentKey` matches no step, EVERY step renders as unreached —
  there is no error; double-check the key values.
- Reached dots use `bg-primary` (works with the scaffold theme);
  unreached dots use `bg-outline-variant` and row spacing uses
  `space-y-2` — both are Material-3/raw utilities that the minimal
  scaffold theme does not generate, so unreached dots can be invisible
  and rows unspaced outside flagship-derived themes.
- Vertical list only; for a horizontal stage rail use
  `@molecule/app-stage-timeline-react`.
