# @molecule/app-notification-center

Notification center core interface for molecule.dev.

Provides a framework-agnostic contract for in-app notification center widgets
with paginated fetching, read/unread tracking, realtime push updates, polling,
and subscription-based state notifications. Bond a provider (e.g.
`@molecule/app-notification-center-default`) at startup, then use
{@link createNotificationCenter} anywhere.

## Quick Start

```typescript
import { setProvider, createNotificationCenter } from '@molecule/app-notification-center'
import { provider } from '@molecule/app-notification-center-default'

setProvider(provider)

const center = createNotificationCenter({
  fetchNotifications: (opts) => api.get('/notifications', opts),
  fetchUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  pollInterval: 30_000,
})

center.onUpdate((state) => {
  console.log('Unread:', state.unreadCount)
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-notification-center
```

## API

### Interfaces

#### `AppNotification`

A single in-app notification.

```typescript
interface AppNotification {
  /** Unique identifier. */
  id: string
  /** Notification type key (e.g. `'mention'`, `'comment'`, `'invite'`). */
  type: string
  /** Short title for the notification (pass through i18n before setting). */
  title: string
  /** Body / description text (pass through i18n before setting). */
  body: string
  /** Whether the notification has been read. */
  read: boolean
  /** Optional URL the notification links to. */
  actionUrl?: string
  /** Optional avatar URL for the notification sender / actor. */
  avatar?: string
  /** Timestamp when the notification was created. */
  createdAt: Date
  /** Arbitrary metadata attached to the notification. */
  metadata?: Record<string, unknown>
}
```

#### `FetchOptions`

Options for fetching a page of notifications.

```typescript
interface FetchOptions {
  /** Opaque cursor for cursor-based pagination. `undefined` fetches the first page. */
  cursor?: string
  /** Maximum number of items to return per page. */
  limit?: number
  /** Optional filter criteria. */
  filter?: NotificationFilter
}
```

#### `NotificationCenterInstance`

A live notification center instance exposing query, mutation, and
subscription methods.

```typescript
interface NotificationCenterInstance {
  // -- Query ---------------------------------------------------------------

  /**
   * Returns the currently loaded notifications.
   *
   * @returns Array of notifications loaded so far.
   */
  getNotifications(): AppNotification[]

  /**
   * Returns the current unread notification count.
   *
   * @returns The unread count.
   */
  getUnreadCount(): number

  /**
   * Returns whether more notifications can be loaded.
   *
   * @returns `true` if additional pages are available.
   */
  hasMore(): boolean

  /**
   * Returns whether a fetch operation is currently in progress.
   *
   * @returns `true` if loading.
   */
  isLoading(): boolean

  // -- Actions -------------------------------------------------------------

  /**
   * Loads the next page of notifications (appends to the current list).
   */
  loadMore(): Promise<void>

  /**
   * Refreshes the notification list and unread count from scratch.
   */
  refresh(): Promise<void>

  /**
   * Marks a single notification as read.
   *
   * @param notificationId - The id of the notification to mark as read.
   */
  markAsRead(notificationId: string): Promise<void>

  /** Marks all notifications as read. */
  markAllAsRead(): Promise<void>

  // -- Subscriptions -------------------------------------------------------

  /**
   * Registers a handler that fires when the notification center state changes.
   *
   * @param handler - The update handler.
   */
  onUpdate(handler: NotificationUpdateHandler): void

  /**
   * Removes a previously registered update handler.
   *
   * @param handler - The handler to remove.
   */
  offUpdate(handler: NotificationUpdateHandler): void

  // -- Lifecycle -----------------------------------------------------------

  /**
   * Returns the current state snapshot.
   *
   * @returns The current {@link NotificationCenterState}.
   */
  getState(): NotificationCenterState

  /**
   * Releases resources held by the notification center instance
   * (stops polling, removes realtime listeners, clears subscriptions).
   */
  destroy(): void
}
```

#### `NotificationCenterOptions`

Configuration for creating a notification center instance.

```typescript
interface NotificationCenterOptions {
  /**
   * Fetches a page of notifications.
   *
   * @param options - Pagination and filter options.
   * @returns A promise resolving to a paginated result of notifications.
   */
  fetchNotifications: (options: FetchOptions) => Promise<PaginatedResult<AppNotification>>

  /**
   * Fetches the current unread notification count.
   *
   * @returns A promise resolving to the unread count.
   */
  fetchUnreadCount: () => Promise<number>

  /**
   * Marks a single notification as read.
   *
   * @param notificationId - The id of the notification to mark as read.
   */
  markAsRead: (notificationId: string) => Promise<void>

  /** Marks all notifications as read. */
  markAllAsRead: () => Promise<void>

  /**
   * Called when a new notification is received (via polling or realtime).
   *
   * @param notification - The new notification.
   */
  onNotification?: (notification: AppNotification) => void

  /**
   * Polling interval in milliseconds for fetching new notifications.
   * Set to `0` or `undefined` to disable polling. Defaults to `0` (disabled).
   */
  pollInterval?: number

  /**
   * Optional realtime transport for receiving push notifications.
   * Any object satisfying {@link NotificationRealtimeAdapter} (e.g. a
   * `RealtimeConnection` from `@molecule/app-realtime`) can be used.
   */
  realtime?: NotificationRealtimeAdapter

  /**
   * The event name to listen for on the realtime adapter.
   * Defaults to `'notification'`.
   */
  realtimeEvent?: string
}
```

#### `NotificationCenterProvider`

Contract that bond packages must implement to provide notification center
functionality.

```typescript
interface NotificationCenterProvider {
  /**
   * Creates a new notification center instance from the given options.
   *
   * @param options - Notification center configuration.
   * @returns A notification center instance.
   */
  createNotificationCenter(options: NotificationCenterOptions): NotificationCenterInstance
}
```

#### `NotificationCenterState`

Snapshot of the notification center state, emitted to subscribers on change.

```typescript
interface NotificationCenterState {
  /** Current list of loaded notifications. */
  notifications: AppNotification[]
  /** Current unread notification count. */
  unreadCount: number
  /** Whether a fetch operation is in progress. */
  loading: boolean
  /** Whether more notifications are available to load. */
  hasMore: boolean
}
```

#### `NotificationFilter`

Filter criteria for narrowing notification queries.

```typescript
interface NotificationFilter {
  /** Filter by notification type (e.g. `'mention'`, `'comment'`). */
  type?: string
  /** Filter by read status. */
  read?: boolean
}
```

#### `NotificationRealtimeAdapter`

Minimal realtime transport interface for receiving push notifications.

Any object with `on` / `off` methods satisfies this contract — including
a realtime connection from the `@molecule/app-realtime` package.

```typescript
interface NotificationRealtimeAdapter {
  /**
   * Registers a handler for an incoming event.
   *
   * @param event - The event name to listen for.
   * @param handler - The handler callback.
   */
  on(event: string, handler: (data: unknown) => void): void

  /**
   * Removes a handler for an event.
   *
   * @param event - The event name.
   * @param handler - The specific handler to remove (optional).
   */
  off(event: string, handler?: (data: unknown) => void): void
}
```

#### `PaginatedResult`

A generic paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The items for the current page. */
  items: T[]
  /** Cursor for fetching the next page. `undefined` when there are no more pages. */
  nextCursor?: string
  /** Whether more items are available beyond this page. */
  hasMore: boolean
  /** Optional total count of items across all pages. */
  total?: number
}
```

### Types

#### `NotificationUpdateHandler`

Handler invoked when the notification center state changes.

```typescript
type NotificationUpdateHandler = (state: NotificationCenterState) => void
```

### Functions

#### `createNotificationCenter(options)`

Creates a notification center instance using the bonded provider.

```typescript
function createNotificationCenter(options: NotificationCenterOptions): NotificationCenterInstance
```

- `options` — Notification center configuration.

**Returns:** A notification center instance.

#### `getProvider()`

Retrieves the bonded notification center provider, throwing if none is
configured.

```typescript
function getProvider(): NotificationCenterProvider
```

**Returns:** The bonded notification center provider.

#### `hasProvider()`

Checks whether a notification center provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a notification center provider is bonded.

#### `setProvider(provider)`

Registers a notification center provider as the active singleton. Called by
bond packages (e.g. `@molecule/app-notification-center-default`) during app
startup.

```typescript
function setProvider(provider: NotificationCenterProvider): void
```

- `provider` — The notification center provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
