# @molecule/app-activity-feed-react

React activity-feed primitives.

Exports:
- `<ActivityFeed>` — flat vertical list of activity rows.
- `<ActivityFeedItem>` — single row (avatar + actor/verb/target + timestamp + body).
- `<ActivityFeedGroup>` — heading + list, compose multiple for "Today / Yesterday" feeds.
- `ActivityFeedItemData` type for row data.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-activity-feed-react
```

## API

### Interfaces

#### `ActivityFeedItemData`

Per-row activity data.

```typescript
interface ActivityFeedItemData {
  /** Row id (React key). */
  id: string
  /** Actor avatar source URL. */
  avatarSrc?: string
  /** Actor display name. */
  actor: ReactNode
  /** Verb describing the action ("commented on", "assigned", "completed"). */
  verb: ReactNode
  /** Object of the action ("the ticket", "Project Alpha", etc.). */
  target?: ReactNode
  /** Optional supporting body (quote, diff, preview). */
  body?: ReactNode
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: ReactNode
  /** Optional leading icon (replaces avatar when present). */
  icon?: ReactNode
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
