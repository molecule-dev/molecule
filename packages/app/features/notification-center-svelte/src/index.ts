/**
 * Svelte notification dropdown panel.
 *
 * Exports `<NotificationCenter>` and `NotificationItem` type. It is the Svelte
 * counterpart of `@molecule/app-notification-center-react`: same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { createNotificationCenter, setProvider } from '@molecule/app-notification-center'
 *   import { provider } from '@molecule/app-notification-center-default'
 *   import { NotificationCenter } from '@molecule/app-notification-center-svelte'
 *
 *   import { api } from './api.js'
 *   import { navigate } from './router.js'
 *
 *   setMoleculeContext({ i18n: i18nProvider })
 *   setProvider(provider)
 *   const center = createNotificationCenter({
 *     fetchNotifications: () => api.get('/notifications'),
 *     fetchUnreadCount: () => api.get('/notifications/unread-count'),
 *     markAsRead: (id) => api.post(`/notifications/${id}/read`),
 *     markAllAsRead: () => api.post('/notifications/read-all'),
 *   })
 * </script>
 *
 * <NotificationCenter
 *   items={center.getState().notifications.map((n) => ({
 *     id: n.id, title: n.title, body: n.body, read: n.read,
 *   }))}
 *   onMarkAllRead={() => center.markAllAsRead()}
 *   onViewAll={() => navigate('/notifications')}
 *   lastError={center.getState().lastError}
 *   onRetry={() => center.refresh()}
 * />
 * ```
 *
 * @remarks
 * Purely presentational — state/fetching live in
 * `@molecule/app-notification-center` (wire its provider, e.g.
 * `@molecule/app-notification-center-default`, via `setProvider()` at
 * startup, then `createNotificationCenter({...})` supplies the state this
 * panel renders). Requires a wired ClassMap bond and a Svelte i18n context —
 * `getClassMap()` and `useTranslation()` both throw before wiring.
 *
 * Pass `lastError` from `NotificationCenterState.lastError` and `onRetry`
 * wired to the instance's `refresh()`. When `lastError` is set the panel
 * renders an error banner with a retry button ABOVE the item list — it
 * never replaces `items` or the empty state, so a stale-but-populated
 * list with a currently-failing background poll still surfaces the
 * failure alongside the last-known-good data.
 *
 * Drop the panel inside your own popover / dropdown / drawer — it ships
 * no trigger button and no outside-click handling. Node props are snippets
 * (or plain strings).
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
