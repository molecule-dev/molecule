/**
 * Notification preferences resource for molecule.dev.
 *
 * Per-user channel toggles keyed by canonical event-type slug — used as the
 * delivery gate for email / push / sms / in-app notifications. Pairs with
 * `@molecule/api-resource-notification` (which stores the resulting
 * notifications) and the various dispatch bonds under
 * `@molecule/api-notifications-*`.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   routes,
 *   requestHandlerMap,
 *   isEnabled,
 * } from '@molecule/api-notifications-preferences'
 *
 * // Wire HTTP routes (mlcl inject does this automatically):
 * //   GET /me/notification-preferences
 * //   PUT /me/notification-preferences
 *
 * // Gate delivery in a notification dispatcher:
 * if (await isEnabled(userId, 'order.shipped', 'email')) {
 *   await sendEmail(...)
 * }
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/notifications_preferences.sql` ships
 *   with this package and must exist in the target database before use
 *   (scaffolded apps apply it automatically; when adding to an existing app,
 *   apply it — adapted to your database bond — first).
 * - **Default-ON semantics: absence means ENABLED.** A user with no row, no entry
 *   for a type, or no field for a channel is opted IN. Always gate delivery with
 *   `isEnabled(userId, type, channel)`; never inspect the `getPreferences()` map
 *   directly — naive missing-key checks either drop wanted notifications or spam
 *   users who opted out.
 * - **The gate only works where it is called.** Every server-side dispatch path
 *   (email/push/sms/in-app senders, cron jobs, event hooks) must call
 *   `isEnabled()` before sending. The shipped routes only manage stored
 *   preferences; nothing enforces them automatically.
 * - **Routes are session-scoped** (`/me/notification-preferences`, `authenticate`):
 *   the handlers take the user from the session — never accept a target userId
 *   from the client for reads or writes.
 * - Type slugs are free-form strings: keep ONE canonical slug per event (e.g.
 *   `order.shipped`) shared by the preferences UI and every dispatch call — a
 *   mismatched slug silently bypasses the user's choice (default-on).
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
