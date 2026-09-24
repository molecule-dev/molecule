/**
 * Database-backed notification center provider for molecule.dev.
 *
 * Implements the `@molecule/api-notification-center` interface using the
 * bonded `@molecule/api-database` DataStore for persistence.
 *
 * @remarks
 * - **The tables must already exist — nothing auto-creates them.** Add a
 *   migration for `notifications` (or your `tableName`) with columns:
 *   `id` (uuid/text, PK), `user_id` (text), `type` (text), `title` (text),
 *   `body` (text), `read` (boolean — 0/1 integers fine on SQLite/MySQL),
 *   `data` (text, JSON-serialized, nullable), `channels` (text,
 *   JSON-serialized, nullable), `created_at` (timestamp). Index
 *   `(user_id, read)` and `(user_id, created_at)` for the list/count paths.
 *   And `notification_preferences` (or `preferencesTableName`): `id` (uuid/
 *   text, PK), `user_id` (text, unique), `email`/`push`/`sms` (boolean),
 *   `channels` (text, JSON-serialized).
 * - **Bond the `@molecule/api-database` DataStore first** — every method
 *   calls `getStore()` and throws without it.
 * - `sendBulk()` inserts sequentially (one `create` per entry, no
 *   transaction) — a mid-batch failure leaves earlier rows written.
 * - **Call the core functions** (`send`, `getAll`, `getUnreadCount`, `markRead`,
 *   `markAllRead`, `deleteNotification`, `getPreferences`, `setPreferences`) from
 *   `@molecule/api-notification-center` — the core's delete is
 *   `deleteNotification()`, not `delete()`.
 * - `markRead()` / `deleteNotification()` are owner-scoped: they return `false`
 *   (no throw) when the id is not that user's notification.
 * - `getAll()` defaults to `limit: 50`, newest first; drive pagination from
 *   the returned `total`, not `items.length`.
 *
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { getAll, getUnreadCount, markRead, send, setProvider } from '@molecule/api-notification-center'
 * import { createProvider } from '@molecule/api-notification-center-database'
 *
 * // Startup: bond the DataStore FIRST (postgresql reads DATABASE_URL), then the notification center.
 * setStore(store)
 * setProvider(createProvider()) // tables: `notifications` + `notification_preferences`
 *
 * const userId = 'user-123'
 * const notification = await send(userId, {
 *   type: 'order.shipped',
 *   title: 'Your order shipped',
 *   body: 'Order #1042 is on its way.',
 *   data: { orderId: '1042' },
 * })
 *
 * const unread = await getUnreadCount(userId) // 1
 * const page = await getAll(userId, { read: false, limit: 20 }) // { items, total, offset, limit }
 * await markRead(userId, notification.id) // true — false if it is not this user's notification
 * console.log(unread, page.total)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
