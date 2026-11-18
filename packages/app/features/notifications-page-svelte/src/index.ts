/**
 * Drop-in `/notifications` page for molecule-built Svelte apps.
 *
 * Exports `NotificationsPage` — a full-page Notifications view that
 * composes `@molecule/app-notification-feed-svelte` and wires it to the
 * routes exposed by `@molecule/api-resource-notification` over the
 * HTTP bond. Header, filter chips (all / unread / mentions), pagination,
 * mark-all-read action, and empty state are all handled internally.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { NotificationsPage } from '@molecule/app-notifications-page-svelte'
 * </script>
 *
 * <NotificationsPage pageSize={25} />
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` and ships in the companion locale
 * bond `@molecule/app-locales-notifications-page`. All styling
 * resolves through `getClassMap()` — no Tailwind class names live in
 * this package.
 *
 * Prereqs: `setMoleculeContext({ http })` in the root layout (from
 * `@molecule/app-svelte` — `useHttpClient()` throws without it), a wired
 * ClassMap bond, and the `i18n` provider. Icons come from the composed
 * `@molecule/app-notification-feed-svelte`, which renders Material
 * Symbols LIGATURES — load the "Material Symbols Outlined" font (and its
 * CSS class) or icon names render as plain text. Notifications whose
 * `data.href` is set render the binding's `Link` rows, which require the
 * router the app's context mounts. Defaults assume the API is proxied at
 * `/api` — override `endpoint` / `markAllReadEndpoint` otherwise.
 *
 * @module
 */

export * from './components.js'
export * from './typeIcons.js'
export * from './types.js'
