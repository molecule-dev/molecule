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
 * <NotificationBadge count={5} variant="error" />
 *
 * <NotificationDot visible variant="info" position="corner" />
 *
 * <NotificationWrapper count={12} placement="top-right">
 *   <span aria-hidden>notifications</span>
 * </NotificationWrapper>
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
 * `<NotificationWrapper>` absolutely positions the badge 4px OUTSIDE the
 * child's corner — an `overflow: hidden` ancestor will clip it.
 *
 * @module
 */

export * from './NotificationBadge.js'
export * from './NotificationDot.js'
export * from './NotificationWrapper.js'
