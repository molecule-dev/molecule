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
    { id: '1', timestamp: '2 hours ago', title: 'Order placed' },
    { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
    { id: '3', timestamp: 'Mar 12', title: 'Item shipped' },
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

#### `TimelineDateProps`

Props for the {@link TimelineDate} component.

```typescript
interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"). */
  children: ReactNode
  /** Extra classes. */
  className?: string
}
```

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
  /**
   * Optional accent color hint. Currently INERT — no component consumes it,
   * so setting it changes nothing; pass a custom `marker` node to color a row.
   */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}
```

#### `TimelineEventProps`

Props for the {@link TimelineEvent} component.

```typescript
interface TimelineEventProps {
  event: TimelineEventData
  /** Whether this is the last event in the list (suppresses the connector). */
  isLast?: boolean
  /** Extra classes. */
  className?: string
}
```

#### `TimelineProps`

Props for the {@link Timeline} component.

```typescript
interface TimelineProps {
  events: TimelineEventData[]
  /** Optional renderer for date separators between consecutive events. */
  renderDateSeparator?: (event: TimelineEventData, prev?: TimelineEventData) => ReactNode
  /** Rendered when there are no events. */
  emptyState?: ReactNode
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

#### `TimelineRailProps`

Props for the {@link TimelineRail} component.

```typescript
interface TimelineRailProps {
  /** Marker for this row — typically a dot or icon. */
  marker?: ReactNode
  /** Whether to render the vertical connector below the marker. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `Timeline(props)`

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

- `props` — Component props (see {@link TimelineProps}).

#### `TimelineDate(props)`

Date separator rendered between timeline groups.

```typescript
function TimelineDate({ children, className }: TimelineDateProps): JSX.Element
```

- `props` — Component props (see {@link TimelineDateProps}).

#### `TimelineEvent(props)`

One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title / body].

```typescript
function TimelineEvent({ event, isLast, className }: TimelineEventProps): JSX.Element
```

- `props` — Component props (see {@link TimelineEventProps}).

#### `TimelineRail(props)`

Left-hand rail of a timeline row — renders the marker and an optional
vertical connector extending downward.

```typescript
function TimelineRail({
  marker,
  connector = true,
  className,
}: TimelineRailProps): JSX.Element
```

- `props` — Component props (see {@link TimelineRailProps}).

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

This is NOT the React binding for `@molecule/app-timeline` (the headless
provider core wired via `setProvider`) — it is standalone presentational
markup with no provider. For domain-specific rows see the sibling
`@molecule/app-{activity,order,status,stage,day}-timeline-react` packages.

`TimelineEventData.accent` is currently INERT — no component reads it, so
setting it changes nothing; color a row by passing a custom `marker` node
instead. `timestamp` is a display node — format/translate it before
passing. The prop surface (documented on the exported `TimelineProps`,
`TimelineEventProps`, `TimelineRailProps` and `TimelineDateProps`
interfaces): Timeline(events, renderDateSeparator, emptyState, className),
TimelineEvent(event, isLast, className), TimelineRail(marker, connector,
className), TimelineDate(children, className).
