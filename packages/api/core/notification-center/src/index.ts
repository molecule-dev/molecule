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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual bell/feed and notification triggers, and
 * check every box off one by one. A box you can't check is an integration bug
 * to fix — not a skip:
 * - [ ] An event that should notify a user (a mention, invite, comment, a
 *   finished job — whatever this app defines) creates an in-app notification
 *   that appears in THAT user's bell/feed with the correct type, title, body,
 *   and any link/target carried in `data`. Sending here writes only the in-app
 *   record — do not expect it to also arrive by email/push.
 * - [ ] The unread badge (from `getUnreadCount`) increments when a new
 *   notification arrives and equals the number of unread items shown in the
 *   feed.
 * - [ ] Marking one read (`markRead`) flips that item to read and drops the
 *   badge by one; mark-all-read (`markAllRead`) shows every item as read and
 *   the badge as zero — and BOTH changes persist across a full reload (they
 *   are stored, not client-only state).
 * - [ ] Real-time: if the app wires a live channel (SSE/websocket), a
 *   notification sent while the feed is open appears WITHOUT a manual reload
 *   and the badge updates live; with no live channel, confirm the new
 *   notification shows on the next feed load / poll.
 * - [ ] Clicking a notification navigates to its target (the link/id in
 *   `data`) and, where that is the intended behavior, marks it read.
 * - [ ] Clearing/deleting one (`deleteNotification`) removes it from the feed
 *   and it does NOT reappear on reload (it is deleted from the store, not just
 *   hidden client-side).
 * - [ ] Scoping — a user sees ONLY their own feed: `getAll` returns just the
 *   authenticated user's items, a notification created for user A never shows
 *   for user B, and no route returns or mutates another user's notification by
 *   id (`markRead`/`deleteNotification` on someone else's id must no-op and
 *   return false, never touch that row). Handlers pass the AUTHENTICATED
 *   user's id — never a client-supplied `userId`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './notification-center.js'
export * from './provider.js'
export * from './types.js'
