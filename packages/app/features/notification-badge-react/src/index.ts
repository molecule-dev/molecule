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
 * Variant colors currently resolve to raw `bg-error` / `bg-warning` /
 * `bg-info` / `bg-success` / `bg-outline` utility classes rather than
 * ClassMap resolvers. In a standard molecule Tailwind app the first four
 * happen to be generated, but `variant="neutral"` maps to `bg-outline`,
 * which standard themes do NOT define — the neutral pill/dot renders
 * transparent. Prefer the four semantic variants, or define an
 * `outline` theme color (and ensure your Tailwind build scans a source
 * containing `bg-outline`) before using `neutral`.
 *
 * `<NotificationWrapper>` absolutely positions the badge 4px OUTSIDE the
 * child's corner — an `overflow: hidden` ancestor will clip it.
 *
 * @module
 */

export * from './NotificationBadge.js'
export * from './NotificationDot.js'
export * from './NotificationWrapper.js'
