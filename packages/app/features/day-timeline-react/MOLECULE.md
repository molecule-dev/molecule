# @molecule/app-day-timeline-react

Vertical 24h day-of-events timeline — itinerary planner, daily agenda,
schedule view. Events are absolutely positioned by start/end hour and
scaled by `pxPerHour`.

## Quick Start

```tsx
import { DayTimeline } from '@molecule/app-day-timeline-react'

<DayTimeline
  startHour={7}
  endHour={22}
  events={[
    { id: 'flight', title: 'Flight to LAX', startHour: 13, endHour: 16 },
    { id: 'dinner', title: 'Dinner', startHour: 19, endHour: 20.5 },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-day-timeline-react
```

## API

### Interfaces

#### `DayTimelineEvent`

A single event positioned on the day axis.

```typescript
interface DayTimelineEvent {
  /** Stable id (used as React key + `data-event-id`). */
  id: string
  /** Event title. */
  title: ReactNode
  /** Optional secondary line (location, type, etc.). */
  subtitle?: ReactNode
  /** Start hour in fractional 24h (e.g. `9.5` = 9:30 AM). */
  startHour: number
  /** End hour in fractional 24h. Must be > `startHour`. */
  endHour: number
  /** Optional accent color (CSS color value). */
  accentColor?: string
  /** Optional click handler. */
  onClick?: () => void
}
```

#### `DayTimelineProps`

Props for {@link DayTimeline}.

```typescript
interface DayTimelineProps {
  /** Events to render on the timeline. */
  events: DayTimelineEvent[]
  /** First hour rendered (inclusive). Defaults to `0`. */
  startHour?: number
  /** Last hour rendered (exclusive). Defaults to `24`. */
  endHour?: number
  /**
   * Pixel height per hour. Drives the overall axis size: total height =
   * `(endHour - startHour) * pxPerHour`. Defaults to `60`.
   */
  pxPerHour?: number
  /**
   * Whether to render the axis tick labels (e.g. "9 AM"). Defaults to
   * `true`.
   */
  showAxisLabels?: boolean
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

### Functions

#### `DayTimeline(props)`

Vertical 24h day-of-events timeline. Events are absolutely positioned
over a 1-hour-tick axis; their height reflects duration. Designed for
itinerary planners, daily agendas, and schedule views.

Pure presentation — drag-to-resize and click-to-add-event are out of
scope here (parents wire those via `event.onClick` and external pointer
handlers if needed).

```typescript
function DayTimeline({
  events,
  startHour = 0,
  endHour = 24,
  pxPerHour = 60,
  showAxisLabels = true,
  dataMolId,
  className,
}: DayTimelineProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered timeline element.

#### `formatHour(hour)`

Format a fractional 24h hour as `H AM/PM` (e.g. `9.5` → `9:30 AM`).

```typescript
function formatHour(hour: number): string
```

- `hour` — Fractional 24h hour value.

**Returns:** A short clock-style label.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
