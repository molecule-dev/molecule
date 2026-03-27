/**
 * Notification center core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for in-app notification center widgets
 * with paginated fetching, read/unread tracking, realtime push updates, polling,
 * and subscription-based state notifications. Bond a provider (e.g.
 * `@molecule/app-notification-center-default`) at startup, then use
 * {@link createNotificationCenter} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createNotificationCenter } from '@molecule/app-notification-center'
 * import { provider } from '@molecule/app-notification-center-default'
 *
 * setProvider(provider)
 *
 * const center = createNotificationCenter({
 *   fetchNotifications: (opts) => api.get('/notifications', opts),
 *   fetchUnreadCount: () => api.get('/notifications/unread-count'),
 *   markAsRead: (id) => api.post(`/notifications/${id}/read`),
 *   markAllAsRead: () => api.post('/notifications/read-all'),
 *   pollInterval: 30_000,
 * })
 *
 * center.onUpdate((state) => {
 *   console.log('Unread:', state.unreadCount)
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
