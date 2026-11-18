/**
 * Drop-in `/notifications` page for molecule-built Solid apps.
 *
 * Exports `NotificationsPage` — a full-page Notifications view that
 * composes `@molecule/app-notification-feed-solid` and wires it to the
 * routes exposed by `@molecule/api-resource-notification` over the
 * HTTP bond. Header, filter chips (all / unread / mentions), pagination,
 * mark-all-read action, and empty state are all handled internally.
 *
 * @example
 * ```tsx
 * import { NotificationsPage } from '@molecule/app-notifications-page-solid'
 *
 * export function NotificationsRoute() {
 *   return <NotificationsPage pageSize={25} />
 * }
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` and ships in the companion locale
 * bond `@molecule/app-locales-notifications-page`. All styling
 * resolves through `getClassMap()` — no Tailwind class names live in
 * this package.
 *
 * Prereqs: a `MoleculeProvider` whose config carries `http` (from
 * `@molecule/app-solid` — `useHttpClient()` throws without it), a wired
 * ClassMap bond, and the `i18n` provider. Icons come from the composed
 * `@molecule/app-notification-feed-solid`, which renders Material
 * Symbols LIGATURES — load the "Material Symbols Outlined" font (and its
 * CSS class) or icon names render as plain text. Notifications whose
 * `data.href` is set render the binding's `Link` rows, which require the
 * router the app's config mounts. Defaults assume the API is proxied at
 * `/api` — override `endpoint` / `markAllReadEndpoint` otherwise.
 *
 * @module
 */

export * from './NotificationsPage.jsx'
export * from './typeIcons.js'
export * from './types.js'
