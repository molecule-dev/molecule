/**
 * Drop-in `/notifications` page for molecule-built Angular apps.
 *
 * Exports `<NotificationsPage>` — a full-page Notifications view that
 * composes `@molecule/app-notification-feed-angular` and wires it to the
 * routes exposed by `@molecule/api-resource-notification` over the
 * HTTP bond. Header, filter chips (all / unread / mentions), pagination,
 * mark-all-read action, and empty state are all handled internally.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { NotificationsPage } from '@molecule/app-notifications-page-angular'
 *
 * @Component({
 *   selector: 'app-notifications-route',
 *   standalone: true,
 *   imports: [NotificationsPage],
 *   template: `<section mol-notifications-page [pageSize]="25"></section>`,
 * })
 * export class NotificationsRoute {}
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` and ships in the companion locale
 * bond `@molecule/app-locales-notifications-page`. All styling
 * resolves through `getClassMap()` — no Tailwind class names live in
 * this package.
 *
 * Prereqs: `provideMolecule({ http })` in the component's injector (from
 * `@molecule/app-angular` — `useHttpClient()` throws without it), a wired
 * ClassMap bond, and the `i18n` provider. Icons come from the composed
 * `@molecule/app-notification-feed-angular`, which renders Material
 * Symbols LIGATURES — load the "Material Symbols Outlined" font (and its
 * CSS class) or icon names render as plain text. Notifications whose
 * `data.href` is set render the binding's `Link` rows, which require the
 * router the app provides. Defaults assume the API is proxied at `/api` —
 * override `endpoint` / `markAllReadEndpoint` otherwise.
 *
 * @module
 */

export * from './notifications-page.component.js'
export * from './typeIcons.js'
export * from './types.js'
