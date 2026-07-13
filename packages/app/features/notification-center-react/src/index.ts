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
 *   lastError={notificationCenter.getState().lastError}
 *   onRetry={() => notificationCenter.refresh()}
 * />
 * ```
 *
 * @remarks
 * Pass `lastError` from `NotificationCenterState.lastError` (see
 * `@molecule/app-notification-center`) and `onRetry` wired to the
 * notification center instance's `refresh()`. When `lastError` is set the
 * panel renders an error banner with a retry button ABOVE the item list —
 * it never replaces `items` or the empty state, so a stale-but-populated
 * list with a currently-failing background poll still surfaces the
 * failure alongside the last-known-good data.
 *
 * @module
 */

export * from './NotificationCenter.js'
