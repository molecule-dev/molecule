/**
 * Notification resource for molecule.dev.
 *
 * Provides Express route handlers for in-app notification management
 * including listing, read status, deletion, and preference management.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-notification'
 *
 * // Routes are registered automatically by mlcl inject
 * // Manual usage:
 * for (const route of routes) {
 *   app[route.method](route.path, requestHandlerMap[route.handler])
 * }
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
 * middleware) and 401s without one. Everything is self-scoped: a user can
 * only ever see, mark, or delete their OWN notifications.
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
