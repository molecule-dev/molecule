# @molecule/app-timeline-react

React chronological timeline primitives.

Exports:
- `<Timeline>` — vertical list of events with optional date separators.
- `<TimelineEvent>` — one event row with rail (marker + connector) + content.
- `<TimelineRail>` — standalone rail (marker + connector) for custom rows.
- `<TimelineDate>` — date separator rendered between groups.
- `TimelineEventData` type for event records.

Use for activity chronologies, deal timelines, order tracking, audit logs.

## Quick Start

```tsx
import { Timeline, TimelineDate } from '@molecule/app-timeline-react'

<Timeline
  events={[
    { id: '1', timestamp: '2 hours ago', title: 'Order placed', accent: 'success' },
    { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
    { id: '3', timestamp: 'Mar 12', title: 'Item shipped', accent: 'info' },
  ]}
  renderDateSeparator={(event, prev) =>
    !prev ? <TimelineDate>{event.timestamp}</TimelineDate> : null
  }
  emptyState={<p>No activity yet.</p>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-timeline-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TimelineEventData`

Timeline event types.

```typescript
interface TimelineEventData {
  id: string
  /** Marker icon / dot — defaults to a small dot. */
  marker?: ReactNode
  /** Display timestamp (ISO, relative, etc.). */
  timestamp: ReactNode
  /** Headline of the event. */
  title: ReactNode
  /** Optional body content. */
  body?: ReactNode
  /** Optional accent color. */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}
```

### Functions

#### `Timeline(root0, root0, root0, root0, root0)`

Vertical chronological list of events. Each event renders with a
marker + connector on the left (`<TimelineEvent>`). Optional date
separators can be inserted by returning a node from `renderDateSeparator`.

```typescript
function Timeline({
  events,
  renderDateSeparator,
  emptyState,
  className,
}: TimelineProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .events
- `root0` — .renderDateSeparator
- `root0` — .emptyState
- `root0` — .className

#### `TimelineDate(root0, root0, root0)`

Date separator rendered between timeline groups.

```typescript
function TimelineDate({ children, className }: TimelineDateProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .className

#### `TimelineEvent(root0, root0, root0, root0)`

One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title / body].

```typescript
function TimelineEvent({ event, isLast, className }: TimelineEventProps): JSX.Element
```

- `root0` — *
- `root0` — .event
- `root0` — .isLast
- `root0` — .className

#### `TimelineRail(root0, root0, root0, root0)`

Left-hand rail of a timeline row — renders the marker and an optional
vertical connector extending downward.

```typescript
function TimelineRail({
  marker,
  connector = true,
  className,
}: TimelineRailProps): JSX.Element
```

- `root0` — *
- `root0` — .marker
- `root0` — .connector
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
