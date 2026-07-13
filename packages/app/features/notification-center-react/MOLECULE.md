# @molecule/app-notification-center-react

Notification dropdown panel.

Exports `<NotificationCenter>` and `NotificationItem` type.

## Quick Start

```tsx
import { NotificationCenter } from '@molecule/app-notification-center-react'

<NotificationCenter
  items={[
    { id: '1', title: 'Build succeeded', body: 'main branch deployed', timestamp: '2m ago', read: false, onClick: () => navigate('/builds') },
    { id: '2', title: 'New comment', body: 'Alice commented on your PR', timestamp: '1h ago', read: true },
  ]}
  onMarkAllRead={() => markAllRead()}
  onViewAll={() => navigate('/notifications')}
  lastError={notificationCenter.getState().lastError}
  onRetry={() => notificationCenter.refresh()}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-center-react
```

## API

### Interfaces

#### `NotificationItem`

A single notification entry rendered inside the notification panel.

```typescript
interface NotificationItem {
  id: string
  title: ReactNode
  body?: ReactNode
  /** Display timestamp. */
  timestamp?: ReactNode
  /** Optional leading icon / avatar. */
  leading?: ReactNode
  /** Whether the user has read this. */
  read?: boolean
  /** Click handler — typically navigates and marks as read. */
  onClick?: () => void
}
```

### Functions

#### `NotificationCenter(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Standalone notification panel — title + mark-all-read action +
scrollable item list + footer "View all". Drop inside a popover /
dropdown / drawer to make a full notification center.

```typescript
function NotificationCenter({
  items,
  onMarkAllRead,
  onViewAll,
  emptyState,
  title,
  className,
  lastError,
  onRetry,
}: NotificationCenterProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .items
- `root0` — .onMarkAllRead
- `root0` — .onViewAll
- `root0` — .emptyState
- `root0` — .title
- `root0` — .className
- `root0` — .lastError
- `root0` — .onRetry

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

Pass `lastError` from `NotificationCenterState.lastError` (see
`@molecule/app-notification-center`) and `onRetry` wired to the
notification center instance's `refresh()`. When `lastError` is set the
panel renders an error banner with a retry button ABOVE the item list —
it never replaces `items` or the empty state, so a stale-but-populated
list with a currently-failing background poll still surfaces the
failure alongside the last-known-good data.
