/**
 * Notification dropdown panel.
 *
 * Exports `<NotificationCenter>` and `NotificationItem` type.
 *
 * @example
 * ```tsx
 * import { useEffect, useState } from 'react'
 *
 * import { get, post } from '@molecule/app-http'
 * import {
 *   type AppNotification,
 *   createNotificationCenter,
 *   type PaginatedResult,
 *   setProvider,
 * } from '@molecule/app-notification-center'
 * import { provider } from '@molecule/app-notification-center-default'
 * import { NotificationCenter } from '@molecule/app-notification-center-react'
 * import { useNavigate } from '@molecule/app-react'
 *
 * // Startup: bond the state provider once, then create one shared center.
 * setProvider(provider)
 * const center = createNotificationCenter({
 *   fetchNotifications: async ({ cursor, limit }) =>
 *     (await get<PaginatedResult<AppNotification>>('/notifications', { params: { cursor, limit } })).data,
 *   fetchUnreadCount: async () => (await get<{ count: number }>('/notifications/unread-count')).data.count,
 *   markAsRead: async (id) => { await post(`/notifications/${id}/read`) },
 *   markAllAsRead: async () => { await post('/notifications/read-all') },
 * })
 *
 * export function NotificationPanel() {
 *   const navigate = useNavigate()
 *   const [state, setState] = useState(() => center.getState())
 *   useEffect(() => {
 *     center.onUpdate(setState) // re-render on every state change
 *     void center.refresh() // never rejects — failures land in state.lastError
 *     return () => center.offUpdate(setState)
 *   }, [])
 *   return (
 *     <NotificationCenter
 *       items={state.notifications.map((n) => ({
 *         id: n.id,
 *         title: n.title,
 *         body: n.body,
 *         read: n.read,
 *         onClick: () => {
 *           center.markAsRead(n.id).catch((error: unknown) => console.error('markAsRead failed', error))
 *           if (n.actionUrl) navigate(n.actionUrl)
 *         },
 *       }))}
 *       onMarkAllRead={() => center.markAllAsRead().catch((error: unknown) => console.error('markAllAsRead failed', error))}
 *       onViewAll={() => navigate('/notifications')}
 *       lastError={state.lastError}
 *       onRetry={() => void center.refresh()}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Purely presentational — state/fetching live in
 * `@molecule/app-notification-center` (wire its provider, e.g.
 * `@molecule/app-notification-center-default`, via `setProvider()` at
 * startup, then `createNotificationCenter({...})` supplies the state this
 * panel renders). Requires a wired ClassMap bond, an icon set
 * (`setIconSet(iconSet)` from `@molecule/app-icons` — the error banner's `Alert` icon throws
 * without it) and a React `I18nProvider` ancestor — `getClassMap()` and `useTranslation()` both
 * throw before wiring.
 *
 * The panel does NOT subscribe to the center: `center.getState()` alone renders once and goes
 * stale — subscribe with `center.onUpdate(handler)` (and `offUpdate` on unmount) as above, and
 * call `refresh()` once to load the first page (nothing fetches on creation unless
 * `pollInterval` is set). `refresh()`/`loadMore()` never reject, but `markAsRead()`/
 * `markAllAsRead()` DO reject when your callback's request fails — catch them. Map
 * `AppNotification` to `NotificationItem` yourself (`createdAt` is a `Date`; `timestamp` wants
 * a display node). "Mark all as read" and "View all" render only when their handler is passed
 * AND there is at least one item.
 *
 * Pass `lastError` from `NotificationCenterState.lastError` and `onRetry`
 * wired to the instance's `refresh()`. When `lastError` is set the panel
 * renders an error banner with a retry button ABOVE the item list — it
 * never replaces `items` or the empty state, so a stale-but-populated
 * list with a currently-failing background poll still surfaces the
 * failure alongside the last-known-good data.
 *
 * Drop the panel inside your own popover / dropdown / drawer — it ships
 * no trigger button and no outside-click handling.
 *
 * @module
 */

export * from './NotificationCenter.js'
