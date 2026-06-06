/**
 * React notification badge / dot / wrapper.
 *
 * Exports:
 * - `<NotificationBadge>` — count pill with `max+` overflow handling.
 * - `<NotificationDot>` — tiny presence indicator.
 * - `<NotificationWrapper>` — positions a badge at the corner of any child.
 *
 * @example
 * ```tsx
 * import { NotificationBadge, NotificationDot, NotificationWrapper } from '@molecule/app-notification-badge-react'
 *
 * // Count pill on its own
 * <NotificationBadge count={5} variant="error" />
 *
 * // Unread presence dot
 * <NotificationDot visible={hasUnread} variant="info" position="corner" />
 *
 * // Badge overlaid on an icon button
 * <NotificationWrapper count={12} placement="top-right">
 *   <BellIcon />
 * </NotificationWrapper>
 * ```
 * @module
 */

export * from './NotificationBadge.js'
export * from './NotificationDot.js'
export * from './NotificationWrapper.js'
