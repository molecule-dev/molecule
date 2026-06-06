/**
 * Vertical notification feed.
 *
 * Exports `<NotificationFeed>` — a list of notification rows with typed
 * icon, title, body, relative time, and unread indicator. Optionally wraps
 * each row in a Link if the notification has an href.
 *
 * @example
 * ```tsx
 * import { NotificationFeed } from '@molecule/app-notification-feed-react'
 *
 * const items = [
 *   { id: '1', icon: 'check_circle', title: 'Build succeeded', body: 'main branch deployed to prod', createdAt: '2024-06-01T09:00:00Z', unread: true, href: '/deployments/42' },
 *   { id: '2', icon: 'chat', title: 'New comment', body: 'Alice left a comment on PR #17', createdAt: '2024-06-01T08:30:00Z' },
 * ]
 *
 * <NotificationFeed items={items} ariaLabel="Notifications" dataMolId="notification-feed" />
 * ```
 *
 * @module
 */

export * from './NotificationFeed.js'
export { fmtRelativeShort } from './fmtRelativeShort.js'
