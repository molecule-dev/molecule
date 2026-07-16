# @molecule/app-notification-center-react

Notification dropdown panel.

Exports `<NotificationCenter>` and `NotificationItem` type.

## Quick Start

```tsx
import { createNotificationCenter, setProvider } from '@molecule/app-notification-center'
import { provider } from '@molecule/app-notification-center-default'
import { NotificationCenter } from '@molecule/app-notification-center-react'

declare const api: { get: (url: string) => Promise<any>; post: (url: string) => Promise<any> }
declare function navigate(to: string): void

setProvider(provider)
const center = createNotificationCenter({
  fetchNotifications: (opts) => api.get('/notifications'),
  fetchUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
})

function Panel() {
  const state = center.getState()
  return (
    <NotificationCenter
      items={state.notifications.map((n) => ({
        id: n.id, title: n.title, body: n.body, read: n.read,
      }))}
      onMarkAllRead={() => center.markAllAsRead()}
      onViewAll={() => navigate('/notifications')}
      lastError={state.lastError}
      onRetry={() => center.refresh()}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-center-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `NotificationCenterProps`

```typescript
interface NotificationCenterProps {
  /** Items to render. */
  items: NotificationItem[]
  /** Called when "Mark all as read" is clicked. Hides the link if omitted. */
  onMarkAllRead?: () => void
  /** Called when "View all" is clicked. */
  onViewAll?: () => void
  /** Empty-state node when items is empty. */
  emptyState?: ReactNode
  /** Title at the top of the panel. */
  title?: ReactNode
  /** Extra classes on the panel wrapper. */
  className?: string
  /**
   * The error from the most recent failed fetch (mirrors
   * `NotificationCenterState.lastError` from `@molecule/app-notification-center`).
   * When set, an error banner with a retry action renders above the list —
   * a stale-but-populated `items` list with a currently-failing background
   * poll must still surface the failure, so the banner never replaces the
   * list or the empty state.
   */
  lastError?: Error
  /**
   * Called when the user clicks "Retry" in the error banner. Typically
   * wired to the notification center instance's `refresh()`.
   */
  onRetry?: () => void
}
```

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

#### `NotificationCenter(props)`

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

- `props` — Component props (see {@link NotificationCenterProps}).

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

Purely presentational — state/fetching live in
`@molecule/app-notification-center` (wire its provider, e.g.
`@molecule/app-notification-center-default`, via `setProvider()` at
startup, then `createNotificationCenter({...})` supplies the state this
panel renders). Requires a wired ClassMap bond and a React
`I18nProvider` ancestor — `getClassMap()` and `useTranslation()` both
throw before wiring.

Pass `lastError` from `NotificationCenterState.lastError` and `onRetry`
wired to the instance's `refresh()`. When `lastError` is set the panel
renders an error banner with a retry button ABOVE the item list — it
never replaces `items` or the empty state, so a stale-but-populated
list with a currently-failing background poll still surfaces the
failure alongside the last-known-good data.

Drop the panel inside your own popover / dropdown / drawer — it ships
no trigger button and no outside-click handling.

## Translations

Translation strings are provided by `@molecule/app-locales-notification-center`.
