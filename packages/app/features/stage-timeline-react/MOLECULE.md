# @molecule/app-stage-timeline-react

Multi-stage horizontal progress timeline with a current-stage marker.
Used by employee-onboarding, applicant-tracking, kanban-board status
flows, and order-fulfillment progress trackers.

## Quick Start

```tsx
import { StageTimeline } from '@molecule/app-stage-timeline-react'

<StageTimeline
  currentIndex={2}
  stages={[
    { id: 'applied', label: 'Applied' },
    { id: 'screen',  label: 'Phone Screen' },
    { id: 'onsite',  label: 'On-site' },
    { id: 'offer',   label: 'Offer' },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-stage-timeline-react
```

## API

### Interfaces

#### `StageTimelineProps`

Props for {@link StageTimeline}.

```typescript
interface StageTimelineProps {
  /** Ordered stages to render, left-to-right. */
  stages: StageTimelineStage[]
  /**
   * Index of the **current** stage (0-based). Stages before this index
   * are rendered as `completed`; stages after are rendered as `upcoming`.
   * Pass `-1` to render every stage as upcoming (e.g. before kickoff).
   * Pass `stages.length` to render every stage as completed (process done).
   */
  currentIndex: number
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

#### `StageTimelineStage`

A single stage on the timeline.

```typescript
interface StageTimelineStage {
  /** Stable id (used as React key + `data-stage-id`). */
  id: string
  /** Stage label (e.g. "Applied", "Phone Screen", "Offer"). */
  label: ReactNode
  /** Optional secondary line (timestamp, owner, etc.). */
  subtitle?: ReactNode
  /** Optional click handler. */
  onClick?: () => void
}
```

### Types

#### `StageStatus`

Per-stage rendering state.

```typescript
type StageStatus = 'completed' | 'current' | 'upcoming'
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
