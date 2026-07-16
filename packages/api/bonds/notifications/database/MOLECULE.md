# @molecule/api-notification-center-database

Database-backed notification center provider for molecule.dev.

Implements the `@molecule/api-notification-center` interface using the
bonded `@molecule/api-database` DataStore for persistence.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-notification-center'
import { createProvider } from '@molecule/api-notification-center-database'

// Bond at startup (requires @molecule/api-database to be bonded)
setProvider(createProvider())

// Or with custom table names
setProvider(createProvider({
  tableName: 'user_notifications',
  preferencesTableName: 'user_notification_prefs',
}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-notification-center-database @molecule/api-database @molecule/api-notification-center
```

## API

### Interfaces

#### `DatabaseNotificationCenterConfig`

Configuration for the database-backed notification center provider.

```typescript
interface DatabaseNotificationCenterConfig {
  /** Table name for notifications. Defaults to `'notifications'`. */
  tableName?: string

  /** Table name for notification preferences. Defaults to `'notification_preferences'`. */
  preferencesTableName?: string
}
```

### Functions

#### `createProvider(config)`

Creates a database-backed {@link NotificationCenterProvider}.

Requires a DataStore to be bonded via `@molecule/api-database` before use.

```typescript
function createProvider(config?: DatabaseNotificationCenterConfig): NotificationCenterProvider
```

- `config` — Database notification center configuration.

**Returns:** A fully initialised `NotificationCenterProvider` backed by the bonded DataStore.

## Core Interface
Implements `@molecule/api-notification-center` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` 1.0.0
- `@molecule/api-notification-center` 1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-notification-center`

- **The tables must already exist — nothing auto-creates them.** Add a
  migration for `notifications` (or your `tableName`) with columns:
  `id` (uuid/text, PK), `user_id` (text), `type` (text), `title` (text),
  `body` (text), `read` (boolean — 0/1 integers fine on SQLite/MySQL),
  `data` (text, JSON-serialized, nullable), `channels` (text,
  JSON-serialized, nullable), `created_at` (timestamp). Index
  `(user_id, read)` and `(user_id, created_at)` for the list/count paths.
  And `notification_preferences` (or `preferencesTableName`): `id` (uuid/
  text, PK), `user_id` (text, unique), `email`/`push`/`sms` (boolean),
  `channels` (text, JSON-serialized).
- **Bond the `@molecule/api-database` DataStore first** — every method
  calls `getStore()` and throws without it.
- `sendBulk()` inserts sequentially (one `create` per entry, no
  transaction) — a mid-batch failure leaves earlier rows written.
- `getAll()` defaults to `limit: 50`, newest first; drive pagination from
  the returned `total`, not `items.length`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual bell/feed and notification triggers, and
check every box off one by one. A box you can't check is an integration bug
to fix — not a skip:
- [ ] An event that should notify a user (a mention, invite, comment, a
  finished job — whatever this app defines) creates an in-app notification
  that appears in THAT user's bell/feed with the correct type, title, body,
  and any link/target carried in `data`. Sending here writes only the in-app
  record — do not expect it to also arrive by email/push.
- [ ] The unread badge (from `getUnreadCount`) increments when a new
  notification arrives and equals the number of unread items shown in the
  feed.
- [ ] Marking one read (`markRead`) flips that item to read and drops the
  badge by one; mark-all-read (`markAllRead`) shows every item as read and
  the badge as zero — and BOTH changes persist across a full reload (they
  are stored, not client-only state).
- [ ] Real-time: if the app wires a live channel (SSE/websocket), a
  notification sent while the feed is open appears WITHOUT a manual reload
  and the badge updates live; with no live channel, confirm the new
  notification shows on the next feed load / poll.
- [ ] Clicking a notification navigates to its target (the link/id in
  `data`) and, where that is the intended behavior, marks it read.
- [ ] Clearing/deleting one (`deleteNotification`) removes it from the feed
  and it does NOT reappear on reload (it is deleted from the store, not just
  hidden client-side).
- [ ] Scoping — a user sees ONLY their own feed: `getAll` returns just the
  authenticated user's items, a notification created for user A never shows
  for user B, and no route returns or mutates another user's notification by
  id (`markRead`/`deleteNotification` on someone else's id must no-op and
  return false, never touch that row). Handlers pass the AUTHENTICATED
  user's id — never a client-supplied `userId`.
