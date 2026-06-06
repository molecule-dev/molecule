/**
 * Notification dropdown panel.
 *
 * Exports `<NotificationCenter>` and `NotificationItem` type.
 *
 * @example
 * ```tsx
 * import { NotificationCenter } from '@molecule/app-notification-center-react'
 *
 * <NotificationCenter
 *   items={[
 *     { id: '1', title: 'Build succeeded', body: 'main branch deployed', timestamp: '2m ago', read: false, onClick: () => navigate('/builds') },
 *     { id: '2', title: 'New comment', body: 'Alice commented on your PR', timestamp: '1h ago', read: true },
 *   ]}
 *   onMarkAllRead={() => markAllRead()}
 *   onViewAll={() => navigate('/notifications')}
 * />
 * ```
 * @module
 */

export * from './NotificationCenter.js'
