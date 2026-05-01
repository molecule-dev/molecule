/**
 * Drop-in `/notifications` page for molecule-built apps.
 *
 * Exports `<NotificationsPage>` — a full-page Notifications view that
 * composes `@molecule/app-notification-feed-react` and wires it to the
 * routes exposed by `@molecule/api-resource-notification` over the
 * HTTP bond. Header, filter chips (all / unread / mentions), pagination,
 * mark-all-read action, and empty state are all handled internally.
 *
 * @example
 * ```tsx
 * import { NotificationsPage } from '@molecule/app-notifications-page-react'
 *
 * export function NotificationsRoute() {
 *   return <NotificationsPage pageSize={25} />
 * }
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` and ships in the companion locale
 * bond `@molecule/app-locales-notifications-page-react`. All styling
 * resolves through `getClassMap()` — no Tailwind class names live in
 * this package.
 *
 * @module
 */

export * from './NotificationsPage.js'
export * from './typeIcons.js'
export * from './types.js'
