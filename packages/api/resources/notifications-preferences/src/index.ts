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
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
