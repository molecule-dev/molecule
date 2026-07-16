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
npm install @molecule/app-stage-timeline-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
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

### Functions

#### `StageTimeline(props)`

Multi-stage horizontal progress timeline with a current-stage marker.
Each stage renders as a labeled circle on a connecting rail; completed
stages fill in, the current stage gets a highlighted ring, and upcoming
stages stay outlined.

Designed for employee-onboarding, applicant-tracking, kanban-board
status flows, and order-fulfillment progress trackers.

```typescript
function StageTimeline({
  stages,
  currentIndex,
  dataMolId,
  className,
}: StageTimelineProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered timeline.

#### `statusOf(i, currentIndex)`

Resolve a stage's rendering status given its index and the current index.

```typescript
function statusOf(i: number, currentIndex: number): StageStatus
```

- `i` — Zero-based stage index.
- `currentIndex` — Index of the current stage (`-1` = none, `len` = all done).

**Returns:** The rendering status for stage `i`.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- Colors are read from `--mol-color-primary`, `--mol-color-on-primary`,
  `--mol-color-primary-container`, `--mol-color-outline`,
  `--mol-color-surface(-variant)`, `--mol-color-on-surface(-variant)`
  CSS custom properties with hardcoded light-theme fallbacks
  (blue #3366ff, black-alpha grays). Define those `--mol-color-*`
  variables in your theme (both light and dark) or the timeline stays
  default-blue and looks wrong in dark mode.
- `currentIndex` semantics: stages before it render completed, after
  it upcoming; pass `-1` for "not started" and `stages.length` for
  "all done".
- Stage dots render as buttons but are disabled unless that stage has
  an `onClick`.
- This is the horizontal stage/pipeline marker; for a vertical
  ordered-step list use `@molecule/app-status-timeline-react`, and for
  wizard/checkout progress chrome use `@molecule/app-stepper-react`.

## Translations

Translation strings are provided by `@molecule/app-locales-stage-timeline`.
