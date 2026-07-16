/**
 * Notification center core interface for molecule.dev.
 *
 * Per-user, persistent IN-APP notifications (the bell-icon inbox): send,
 * paginated listing, unread counts, mark-read, owner-scoped delete, and
 * per-user notification preferences. For fire-and-forget ops/broadcast
 * channels (Slack/webhook alerts), use `@molecule/api-notifications` instead.
 *
 * @remarks
 * - **Wire the database first — and migrate the tables.** The database-backed
 *   bond (`@molecule/api-notification-center-database`) persists through the
 *   bonded `@molecule/api-database` DataStore: bond the DataStore before
 *   `setProvider(createProvider())`, and create the `notifications` and
 *   `notification_preferences` tables in your app's migrations (see the bond's
 *   docs for the expected columns) — nothing auto-creates them.
 * - **Every operation is owner-scoped by `userId`** — `markRead` /
 *   `deleteNotification` affect only that user's row (returning `false` when
 *   nothing matched) and `getAll` returns only that user's items. In handlers,
 *   ALWAYS pass the AUTHENTICATED user's id — forwarding a client-supplied
 *   `userId` recreates the cross-user access the scoping exists to prevent.
 * - `getAll` returns a paginated `{ items, total, offset, limit }` result —
 *   drive the UI from `items` + `total`, not `items.length`.
 * - Sending here does NOT deliver email/push — it writes the in-app record.
 *   Fan out to `@molecule/api-emails` / push packages separately (honoring
 *   `getPreferences(userId)`) when a notification should also leave the app.
 *
 * @example
 * ```typescript
 * import { setProvider, send, getAll, markRead } from '@molecule/api-notification-center'
 * import { createProvider } from '@molecule/api-notification-center-database'
 *
 * // Startup — after the @molecule/api-database DataStore is bonded
 * setProvider(createProvider())
 *
 * // Send an in-app notification
 * const notification = await send('user-123', {
 *   type: 'system',
 *   title: 'Welcome!',
 *   body: 'Your account is ready.',
 * })
 *
 * // List unread notifications
 * const { items, total } = await getAll('user-123', { read: false })
 *
 * // Mark as read (scoped to the owner — only affects this user's row)
 * await markRead('user-123', notification.id)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './notification-center.js'
export * from './provider.js'
export * from './types.js'
