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
 * export function HeaderActions() {
 *   const unread = { inbox: 128, tasks: 3, mentions: 0 }
 *   const hasNewMessages = true
 *   return (
 *     <nav>
 *       <NotificationWrapper count={unread.inbox} placement="top-right">
 *         <button type="button" aria-label={`Inbox, ${unread.inbox} unread`}>Inbox</button>
 *       </NotificationWrapper>
 *       <a href="/tasks">
 *         Tasks <NotificationBadge count={unread.tasks} variant="info" />
 *       </a>
 *       <a href="/mentions">
 *         Mentions <NotificationBadge count={unread.mentions} />
 *       </a>
 *       <a href="/messages">
 *         Messages <NotificationDot visible={hasNewMessages} variant="success" />
 *       </a>
 *     </nav>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * Every variant resolves to a real theme background token, so all five are
 * visible in both light and dark themes: `error` / `warning` / `info` /
 * `success` map to the semantic status colors, and `neutral` maps to the
 * `surface-secondary` surface token (what `cm.surfaceSecondary` emits) for a
 * neutral grey fill. (`neutral` previously used `bg-outline`, which no theme
 * defines, so the neutral pill/dot rendered transparent — fixed.)
 *
 * Counts above `max` (default 99) render as `99+`; a count of 0 renders NOTHING unless
 * `hideOnZero={false}`. The badge's accessible label is just the raw number and the dot is
 * `aria-hidden` — put the meaning ("Inbox, 128 unread") in the wrapped control's own
 * `aria-label`. These are display-only: they fetch no counts and have no click handler.
 * `NotificationDot position="corner"` is absolutely positioned but does not make its parent
 * `relative` — use `<NotificationWrapper>` (which does) for a count on a corner.
 *
 * `<NotificationWrapper>` absolutely positions the badge 4px OUTSIDE the
 * child's corner — an `overflow: hidden` ancestor will clip it.
 *
 * @module
 */

export * from './NotificationBadge.js'
export * from './NotificationDot.js'
export * from './NotificationWrapper.js'
