# @molecule/app-notification-center-default

Default notification center provider for molecule.dev.

Implements `NotificationCenterProvider` from `@molecule/app-notification-center`
using pure TypeScript in-memory state management with support for polling,
realtime push updates, and subscription-based state notifications.

## Quick Start

```typescript
import { provider } from '@molecule/app-notification-center-default'
import { setProvider } from '@molecule/app-notification-center'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-notification-center-default @molecule/app-notification-center
```

## API

### Interfaces

#### `DefaultNotificationCenterConfig`

Provider-specific configuration for the default notification center provider.

```typescript
interface DefaultNotificationCenterConfig {
  /**
   * Default number of notifications to fetch per page.
   * Defaults to `20`.
   */
  defaultPageSize?: number

  /**
   * Whether to automatically refresh the unread count when polling.
   * Defaults to `true`.
   */
  refreshUnreadOnPoll?: boolean
}
```

### Functions

#### `createDefaultProvider(config)`

Creates a default notification center provider.

```typescript
function createDefaultProvider(config?: DefaultNotificationCenterConfig): NotificationCenterProvider
```

- `config` — Optional provider-specific configuration.

**Returns:** A `NotificationCenterProvider` backed by in-memory state management.

### Constants

#### `provider`

Default notification center provider instance.

```typescript
const provider: NotificationCenterProvider
```

## Core Interface
Implements `@molecule/app-notification-center` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-notification-center'
import { provider } from '@molecule/app-notification-center-default'

export function setupNotificationCenterDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-notification-center` >=1.0.0

### Runtime Dependencies

- `@molecule/app-notification-center`

`poll()`, `loadMore()`, and `refresh()` all catch their own fetch
failures — the in-memory list is never wiped and the loop/promise chain
never throws — but the failure is not silently discarded: it is captured
into `NotificationCenterState.lastError` (cleared back to `undefined` on
the next successful call of that same method) and emitted to subscribers,
so a UI consumer can render a retry affordance even while a
stale-but-populated list continues to display.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Unread notifications render with a distinct unread treatment vs read
  ones, and the unread badge/count (`unreadCount` / `getUnreadCount()`)
  exactly equals the number of loaded AppNotifications with `read: false`.
- [ ] Clicking a notification navigates to its own `actionUrl` (its target,
  not a shared/hardcoded route) AND marks it read (`markAsRead(id)`): its
  `read` flag flips, it loses the unread treatment, and the badge decrements
  by one — and that stays after a full reload (persisted server-side, not
  just local state).
- [ ] `markAllAsRead()` drops the unread badge to 0 and NO remaining item
  still shows the unread treatment; the cleared state survives a reload.
- [ ] Applying a filter (unread-only via `NotificationFilter.read` / by-type
  via `NotificationFilter.type`, passed as `FetchOptions.filter`) renders
  ONLY matching notifications and the visible count reflects the filter
  honestly — no read items leak into an unread-only view.
- [ ] Load-more / pagination (`loadMore()` following `PaginatedResult.hasMore`
  + `nextCursor`) appends OLDER notifications to the list with zero
  duplicates — every rendered `id` is unique — and the control stops once
  `hasMore` is false.
- [ ] A notification pushed over the realtime transport
  (`NotificationRealtimeAdapter` wired via `realtime` / `realtimeEvent`,
  surfaced through `onNotification`) appears at the TOP of the list and bumps
  the unread badge WITHOUT any manual reload or refetch.
- [ ] With zero notifications the panel shows a real empty state (not a blank
  or broken widget), and that empty state is visibly distinct from a failed
  fetch — a `lastError` renders a retry affordance, never a silent "empty".
- [ ] A user sees ONLY their own notifications: an `id` belonging to another
  user is never listed, and cannot be reached via `markAsRead(id)` or the
  click-through `actionUrl` (no cross-user read/navigation).
