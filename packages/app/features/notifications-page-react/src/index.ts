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
 * import { BrowserRouter } from 'react-router'
 *
 * import { getClient } from '@molecule/app-http'
 * import { createSimpleI18nProvider } from '@molecule/app-i18n'
 * import { NotificationsPage } from '@molecule/app-notifications-page-react'
 * import { MoleculeProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * setClassMap(classMap) // startup — getClassMap() throws until then
 *
 * export function App() {
 *   // `http` feeds useHttpClient(), `i18n` feeds useTranslation(); the router is for `data.href` rows.
 *   return (
 *     <MoleculeProvider http={getClient()} i18n={createSimpleI18nProvider('en')}>
 *       <BrowserRouter>
 *         <NotificationsPage
 *           pageSize={25}
 *           endpoint="/api/notifications" // GET ?limit=25&offset=0 (+ read=false | type=mention)
 *           markAllReadEndpoint="/api/notifications/read-all" // POST
 *           typeIcons={{ deploy: 'rocket_launch' }}
 *         />
 *       </BrowserRouter>
 *     </MoleculeProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` and ships in the companion locale
 * bond `@molecule/app-locales-notifications-page`. All styling
 * resolves through `getClassMap()` — no Tailwind class names live in
 * this package.
 *
 * The endpoint must answer `{ items, total, offset, limit }` (`NotificationsPageResult`) — a
 * bare array renders nothing. It paginates by `offset`/`limit`, NOT cursors, and the unread
 * count / "Mark N as read" button only counts the CURRENT page. Rows are not clickable to mark
 * a single notification read; only `data.href` makes a row a link. A failed "mark all read"
 * POST is ignored (the list just reloads).
 *
 * Prereqs: an `<HttpProvider>` ancestor (from `@molecule/app-react` —
 * `useHttpClient()` throws without it), a wired ClassMap bond, and an
 * `I18nProvider`. Icons come from the composed
 * `@molecule/app-notification-feed-react`, which renders Material
 * Symbols LIGATURES — load the "Material Symbols Outlined" font (and its
 * CSS class) or icon names render as plain text. Notifications whose
 * `data.href` is set render react-router `<Link>` rows, which require a
 * `<Router>` ancestor. Defaults assume the API is proxied at `/api` —
 * override `endpoint` / `markAllReadEndpoint` otherwise.
 *
 * @module
 */

export * from './NotificationsPage.js'
export * from './typeIcons.js'
export * from './types.js'
