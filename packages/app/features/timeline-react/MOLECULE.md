# @molecule/app-timeline-react

React chronological timeline primitives.

Exports:
- `<Timeline>` — vertical list of events with optional date separators.
- `<TimelineEvent>` — one event row with rail (marker + connector) + content.
- `<TimelineRail>` — standalone rail (marker + connector) for custom rows.
- `<TimelineDate>` — date separator rendered between groups.
- `TimelineEventData` type for event records.

Use for activity chronologies, deal timelines, order tracking, audit logs.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-timeline-react
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
