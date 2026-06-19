/**
 * Notification center core interface for molecule.dev.
 *
 * Defines the standard interface for in-app notification management
 * providers (database-backed, etc.).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, send, getAll, markRead } from '@molecule/api-notification-center'
 *
 * // Bond a provider at startup
 * setProvider(databaseProvider)
 *
 * // Send a notification
 * const notification = await send('user-123', {
 *   type: 'system',
 *   title: 'Welcome!',
 *   body: 'Your account is ready.',
 * })
 *
 * // List unread notifications
 * const { items } = await getAll('user-123', { read: false })
 *
 * // Mark as read (scoped to the owner — only affects this user's row)
 * await markRead('user-123', notification.id)
 * ```
 */

export * from './notification-center.js'
export * from './provider.js'
export * from './types.js'
