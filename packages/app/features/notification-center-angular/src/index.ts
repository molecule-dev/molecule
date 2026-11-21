/**
 * Angular notification dropdown panel.
 *
 * Exports `<NotificationCenter>` and `NotificationItem` type. It is the Angular
 * counterpart of `@molecule/app-notification-center-react`: same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { createNotificationCenter, setProvider } from '@molecule/app-notification-center'
 * import { provider } from '@molecule/app-notification-center-default'
 * import { NotificationCenter } from '@molecule/app-notification-center-angular'
 * import { api } from './api.js'
 * import { navigate } from './router.js'
 *
 * setProvider(provider)
 * const center = createNotificationCenter({
 *   fetchNotifications: () => api.get('/notifications'),
 *   fetchUnreadCount: () => api.get('/notifications/unread-count'),
 *   markAsRead: (id) => api.post(`/notifications/${id}/read`),
 *   markAllAsRead: () => api.post('/notifications/read-all'),
 * })
 *
 * @Component({
 *   selector: 'app-page',
 *   standalone: true,
 *   imports: [NotificationCenter],
 *   template: `
 *     <div
 *       mol-notification-center
 *       [items]="items()"
 *       [onMarkAllRead]="markAllRead"
 *       [onViewAll]="viewAll"
 *       [lastError]="lastError()"
 *       [onRetry]="refresh"
 *     ></div>
 *   `,
 * })
 * export class Page {
 *   readonly state = center.getState()
 *   readonly items = () =>
 *     this.state.notifications.map((n) => ({
 *       id: n.id, title: n.title, body: n.body, read: n.read,
 *     }))
 *   readonly lastError = () => this.state.lastError
 *   readonly markAllRead = () => center.markAllAsRead()
 *   readonly viewAll = () => navigate('/notifications')
 *   readonly refresh = () => center.refresh()
 * }
 * ```
 *
 * @remarks
 * Purely presentational — state/fetching live in
 * `@molecule/app-notification-center` (wire its provider, e.g.
 * `@molecule/app-notification-center-default`, via `setProvider()` at
 * startup, then `createNotificationCenter({...})` supplies the state this
 * panel renders). Requires a wired ClassMap bond and an Angular i18n provider
 * — `getClassMap()` and `useTranslation()` both throw before wiring.
 *
 * Pass `lastError` from `NotificationCenterState.lastError` and `onRetry`
 * wired to the instance's `refresh()`. When `lastError` is set the panel
 * renders an error banner with a retry button ABOVE the item list — it
 * never replaces `items` or the empty state, so a stale-but-populated
 * list with a currently-failing background poll still surfaces the
 * failure alongside the last-known-good data.
 *
 * The host IS the root `<div>` (`div[mol-notification-center]`). Drop the
 * panel inside your own popover / dropdown / drawer — it ships no trigger
 * button and no outside-click handling. Node props (`title`, `emptyState`)
 * are projected content (`[slot=title]`, `[slot=emptyState]`) or a template
 * reference passed as an input.
 *
 * @module
 */

export * from './notification-center.component.js'
export * from './types.js'
