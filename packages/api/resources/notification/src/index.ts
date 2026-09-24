/**
 * Notification resource for molecule.dev.
 *
 * Provides Express route handlers for in-app notification management
 * including listing, read status, deletion, and preference management.
 *
 * @module
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { send, setProvider } from '@molecule/api-notification-center'
 * import { createProvider } from '@molecule/api-notification-center-database'
 * import { requestHandlerMap as Notification } from '@molecule/api-resource-notification'
 *
 * // Startup: bond the DataStore (the postgresql bond reads DATABASE_URL), THEN the
 * // notification-center provider that these handlers call.
 * setStore(store)
 * setProvider(createProvider())
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session; without it every route answers 401).
 * export const router = express.Router()
 * router.get('/notifications', Notification.list) // { items, total, offset, limit }
 * router.get('/notifications/unread-count', Notification.unreadCount) // { count }
 * router.get('/notifications/preferences', Notification.getPreferences)
 * router.post('/notifications/:id/read', Notification.markRead) // 204, 404 if not yours
 * router.post('/notifications/read-all', Notification.markAllRead)
 * router.put('/notifications/preferences', Notification.updatePreferences)
 * router.delete('/notifications/:id', Notification.del)
 *
 * // Feature code CREATES notifications through the core (there is no POST route here):
 * await send('user-123', { type: 'order', title: 'Order shipped', body: 'Order #1042 is on its way.' })
 * ```
 *
 * @remarks
 * This package is only the HTTP MANAGEMENT surface (list / unread-count /
 * mark-read / delete / preferences) over `@molecule/api-notification-center`.
 * Wire a notification-center provider (e.g.
 * `@molecule/api-notification-center-database`) BEFORE these handlers run —
 * without one every call throws "provider not configured". There is NO create
 * endpoint here: CREATE notifications through notification-center from your
 * feature code.
 *
 * Tables: `src/__setup__/notifications.sql` creates BOTH tables the database
 * provider's contract requires — `notifications` (snake_case `user_id`,
 * `created_at`, …, plus `channels`, which the provider's `send()` ALWAYS
 * writes: without that column every create 500s) and `notification_preferences`
 * (one row per user: `email`/`push`/`sms` booleans + JSON `channels` map;
 * without it the preferences routes 500). An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once. Do
 * NOT "normalise" the columns to camelCase — the provider maps rows itself
 * and a mismatched column 500s every request.
 *
 * The route table carries no auth middleware — each handler reads the
 * authenticated user from `res.locals.session` (mount behind your global auth
 * middleware) and 401s without one. `GET /notifications` returns
 * `{ items, total, offset, limit }` (read the rows off `items`, paginate with
 * `?limit`/`?offset`, filter with `?read=true|false` / `?type=`), and
 * `GET /notifications/unread-count` returns `{ count }`. Everything is self-scoped: a user can
 * only ever see, mark, or delete their OWN notifications.
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
