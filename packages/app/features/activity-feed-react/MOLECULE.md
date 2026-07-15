# @molecule/app-activity-feed-react

React activity-feed primitives.

Exports:
- `<ActivityFeed>` — flat vertical list of activity rows.
- `<ActivityFeedItem>` — single row (avatar + actor/verb/target + timestamp + body).
- `<ActivityFeedGroup>` — heading + list, compose multiple for "Today / Yesterday" feeds.
- `ActivityFeedItemData` type for row data.

## Quick Start

```tsx
import { ActivityFeed, ActivityFeedGroup } from '@molecule/app-activity-feed-react'

const items = [
  { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
  { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
]

// Flat feed
<ActivityFeed items={items} emptyState={<p>No activity yet.</p>} />

// Grouped by date
<ActivityFeedGroup heading="Today" items={items} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-activity-feed-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

### Functions

#### `ActivityFeed(root0, root0, root0, root0, root0)`

Simple activity feed — renders each `ActivityFeedItemData` via
`<ActivityFeedItem>` and stacks them. For date-grouped feeds use
`<ActivityFeedGroup>`.

```typescript
function ActivityFeed({
  items,
  emptyState,
  footer,
  className,
}: ActivityFeedProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .emptyState
- `root0` — .footer
- `root0` — .className

#### `ActivityFeedGroup(root0, root0, root0, root0)`

Date-grouped activity section — a heading followed by a stack of items.
Compose multiple `<ActivityFeedGroup>`s together for an organized
"Today / Yesterday / Last week" feed.

```typescript
function ActivityFeedGroup({
  heading,
  items,
  className,
}: ActivityFeedGroupProps): JSX.Element
```

- `root0` — *
- `root0` — .heading
- `root0` — .items
- `root0` — .className

#### `ActivityFeedItem(root0, root0, root0)`

One entry in an `<ActivityFeed>`.

Shape: `[avatar|icon] [actor verb target · timestamp] [body]`.

```typescript
function ActivityFeedItem({ item, className }: ActivityFeedItemProps): JSX.Element
```

- `root0` — *
- `root0` — .item
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
