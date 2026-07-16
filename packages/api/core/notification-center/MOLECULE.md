# @molecule/api-notification-center

Notification center core interface for molecule.dev.

Per-user, persistent IN-APP notifications (the bell-icon inbox): send,
paginated listing, unread counts, mark-read, owner-scoped delete, and
per-user notification preferences. For fire-and-forget ops/broadcast
channels (Slack/webhook alerts), use `@molecule/api-notifications` instead.

## Quick Start

```typescript
import { setProvider, send, getAll, markRead } from '@molecule/api-notification-center'
import { createProvider } from '@molecule/api-notification-center-database'

// Startup — after the @molecule/api-database DataStore is bonded
setProvider(createProvider())

// Send an in-app notification
const notification = await send('user-123', {
  type: 'system',
  title: 'Welcome!',
  body: 'Your account is ready.',
})

// List unread notifications
const { items, total } = await getAll('user-123', { read: false })

// Mark as read (scoped to the owner — only affects this user's row)
await markRead('user-123', notification.id)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-notification-center @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `BulkNotification`

A bulk notification targeting a specific user.

```typescript
interface BulkNotification {
  /** The target user. */
  userId: string

  /** The notification to send. */
  notification: CreateNotification
}
```

#### `CreateNotification`

Data required to create a new notification.

```typescript
interface CreateNotification {
  /** Notification category. */
  type: string

  /** Notification headline. */
  title: string

  /** Notification body text. */
  body: string

  /** Arbitrary structured data to attach. */
  data?: Record<string, unknown>

  /** Delivery channels for this notification. Defaults to `['inApp']`. */
  channels?: ('inApp' | 'email' | 'push' | 'sms')[]
}
```

#### `Notification`

An in-app notification.

```typescript
interface Notification {
  /** Provider-assigned notification identifier. */
  id: string

  /** The user this notification belongs to. */
  userId: string

  /** Notification category (e.g. 'system', 'message', 'alert'). */
  type: string

  /** Notification headline. */
  title: string

  /** Notification body text. */
  body: string

  /** Whether the notification has been read. */
  read: boolean

  /** Arbitrary structured data attached to the notification. */
  data?: Record<string, unknown>

  /** When the notification was created. */
  createdAt: Date
}
```

#### `NotificationCenterProvider`

Notification center provider interface.

All notification center providers must implement this interface to provide
in-app notification CRUD, read status management, and user preferences.

```typescript
interface NotificationCenterProvider {
  /**
   * Sends a notification to a specific user.
   *
   * @param userId - The target user identifier.
   * @param notification - The notification to create.
   * @returns The created notification.
   */
  send(userId: string, notification: CreateNotification): Promise<Notification>

  /**
   * Sends notifications to multiple users in a single batch.
   *
   * @param notifications - Array of user-targeted notifications.
   * @returns The created notifications.
   */
  sendBulk(notifications: BulkNotification[]): Promise<Notification[]>

  /**
   * Retrieves all notifications for a user with optional filtering.
   *
   * @param userId - The user to retrieve notifications for.
   * @param options - Optional query filters and pagination.
   * @returns Paginated notification results.
   */
  getAll(userId: string, options?: NotificationQuery): Promise<PaginatedResult<Notification>>

  /**
   * Returns the count of unread notifications for a user.
   *
   * @param userId - The user to count unread notifications for.
   * @returns The unread notification count.
   */
  getUnreadCount(userId: string): Promise<number>

  /**
   * Marks a single notification as read, scoped to its owner.
   *
   * Implementations MUST only affect rows where `user_id = userId` so a user
   * can never mark another user's notification read by id (IDOR).
   *
   * @param userId - The owner whose notification should be marked read.
   * @param notificationId - The notification to mark as read.
   * @returns `true` if a row owned by `userId` was updated, `false` otherwise.
   */
  markRead(userId: string, notificationId: string): Promise<boolean>

  /**
   * Marks all notifications for a user as read.
   *
   * @param userId - The user whose notifications should be marked read.
   */
  markAllRead(userId: string): Promise<void>

  /**
   * Deletes a notification, scoped to its owner.
   *
   * Implementations MUST only affect rows where `user_id = userId` so a user
   * can never delete another user's notification by id (IDOR).
   *
   * @param userId - The owner whose notification should be deleted.
   * @param notificationId - The notification to delete.
   * @returns `true` if a row owned by `userId` was deleted, `false` otherwise.
   */
  delete(userId: string, notificationId: string): Promise<boolean>

  /**
   * Retrieves notification preferences for a user.
   *
   * @param userId - The user to retrieve preferences for.
   * @returns The user's notification preferences.
   */
  getPreferences(userId: string): Promise<NotificationPreferences>

  /**
   * Updates notification preferences for a user.
   *
   * @param userId - The user to update preferences for.
   * @param preferences - The preferences to merge.
   */
  setPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>
}
```

#### `NotificationPreferences`

User notification preferences.

```typescript
interface NotificationPreferences {
  /** Whether email notifications are enabled. */
  email: boolean

  /** Whether push notifications are enabled. */
  push: boolean

  /** Whether SMS notifications are enabled. */
  sms: boolean

  /** Per-channel or per-type overrides. */
  channels: Record<string, boolean>
}
```

#### `NotificationQuery`

Query options for listing notifications.

```typescript
interface NotificationQuery {
  /** Maximum number of results to return. */
  limit?: number

  /** Number of results to skip. */
  offset?: number

  /** Filter by read status. */
  read?: boolean

  /** Filter by notification type. */
  type?: string
}
```

#### `PaginatedResult`

Paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The result items for this page. */
  items: T[]

  /** Total number of matching items. */
  total: number

  /** Number of items skipped. */
  offset: number

  /** Maximum items per page. */
  limit: number
}
```

### Functions

#### `deleteNotification(userId, notificationId)`

Deletes a notification, scoped to its owner.

Only deletes the notification when it belongs to `userId`, preventing a user
from deleting another user's notification by id (IDOR).

```typescript
function deleteNotification(userId: string, notificationId: string): Promise<boolean>
```

- `userId` — The owner whose notification should be deleted.
- `notificationId` — The notification to delete.

**Returns:** `true` if a row owned by `userId` was deleted, `false` otherwise.

#### `getAll(userId, options)`

Retrieves all notifications for a user with optional filtering.

```typescript
function getAll(userId: string, options?: NotificationQuery): Promise<PaginatedResult<Notification>>
```

- `userId` — The user to retrieve notifications for.
- `options` — Optional query filters and pagination.

**Returns:** Paginated notification results.

#### `getPreferences(userId)`

Retrieves notification preferences for a user.

```typescript
function getPreferences(userId: string): Promise<NotificationPreferences>
```

- `userId` — The user to retrieve preferences for.

**Returns:** The user's notification preferences.

#### `getProvider()`

Retrieves the bonded notification center provider, throwing if none is configured.

```typescript
function getProvider(): NotificationCenterProvider
```

**Returns:** The bonded notification center provider.

#### `getUnreadCount(userId)`

Returns the count of unread notifications for a user.

```typescript
function getUnreadCount(userId: string): Promise<number>
```

- `userId` — The user to count unread notifications for.

**Returns:** The unread notification count.

#### `hasProvider()`

Checks whether a notification center provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a notification center provider is bonded.

#### `markAllRead(userId)`

Marks all notifications for a user as read.

```typescript
function markAllRead(userId: string): Promise<void>
```

- `userId` — The user whose notifications should be marked read.

**Returns:** Resolves when all notifications have been marked read.

#### `markRead(userId, notificationId)`

Marks a single notification as read, scoped to its owner.

Only affects the notification when it belongs to `userId`, preventing a user
from marking another user's notification read by id (IDOR).

```typescript
function markRead(userId: string, notificationId: string): Promise<boolean>
```

- `userId` — The owner whose notification should be marked read.
- `notificationId` — The notification to mark as read.

**Returns:** `true` if a row owned by `userId` was updated, `false` otherwise.

#### `send(userId, notification)`

Sends a notification to a specific user.

```typescript
function send(userId: string, notification: CreateNotification): Promise<Notification>
```

- `userId` — The target user identifier.
- `notification` — The notification to create.

**Returns:** The created notification.

#### `sendBulk(notifications)`

Sends notifications to multiple users in a single batch.

```typescript
function sendBulk(notifications: BulkNotification[]): Promise<Notification[]>
```

- `notifications` — Array of user-targeted notifications.

**Returns:** The created notifications.

#### `setPreferences(userId, preferences)`

Updates notification preferences for a user.

```typescript
function setPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>
```

- `userId` — The user to update preferences for.
- `preferences` — The preferences to merge.

**Returns:** Resolves when preferences have been updated.

#### `setProvider(provider)`

Registers a notification center provider as the active singleton. Called
by bond packages during application startup.

```typescript
function setProvider(provider: NotificationCenterProvider): void
```

- `provider` — The notification center provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Notifications | `@molecule/api-notification-center-database` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

- **Wire the database first — and migrate the tables.** The database-backed
  bond (`@molecule/api-notification-center-database`) persists through the
  bonded `@molecule/api-database` DataStore: bond the DataStore before
  `setProvider(createProvider())`, and create the `notifications` and
  `notification_preferences` tables in your app's migrations (see the bond's
  docs for the expected columns) — nothing auto-creates them.
- **Every operation is owner-scoped by `userId`** — `markRead` /
  `deleteNotification` affect only that user's row (returning `false` when
  nothing matched) and `getAll` returns only that user's items. In handlers,
  ALWAYS pass the AUTHENTICATED user's id — forwarding a client-supplied
  `userId` recreates the cross-user access the scoping exists to prevent.
- `getAll` returns a paginated `{ items, total, offset, limit }` result —
  drive the UI from `items` + `total`, not `items.length`.
- Sending here does NOT deliver email/push — it writes the in-app record.
  Fan out to `@molecule/api-emails` / push packages separately (honoring
  `getPreferences(userId)`) when a notification should also leave the app.
