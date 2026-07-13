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
 * @remarks
 * `NotificationCenterState.lastError` is the error surface for a failed
 * `refresh()` / `loadMore()` / `poll()` attempt. Without it, a provider that
 * documents fetch failures as a silent noop renders a FIRST-load failure
 * identically to "you have no notifications" — both are an empty list with
 * `loading: false`, and a consumer UI cannot tell "network/server error"
 * from "genuinely empty" or show a retry banner.
 *
 * Provider implementations (e.g. `@molecule/app-notification-center-default`)
 * MUST populate `lastError` in their fetch catch blocks and clear it
 * (`lastError: undefined`) on the next successful fetch — it is not a
 * sticky banner that survives a later success. Framework bindings (e.g.
 * `@molecule/app-notification-center-react`) should read this field to
 * render a retry affordance instead of a bare empty state.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
