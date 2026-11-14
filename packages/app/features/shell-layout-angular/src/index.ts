/**
 * Angular top-level app shell layout — the counterpart of
 * `@molecule/app-shell-layout-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<AppShellLayout>` — header slot + main content + footer slot, with
 * the page frame styled via the ClassMap bond. Apps fill the slots with their
 * own header, footer, and route content (typically the routed page).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AppShellLayout } from '@molecule/app-shell-layout-angular'
 * import { AppFooter } from '@molecule/app-footer-angular'
 * import { AppHeader } from '@molecule/app-header-angular'
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [AppShellLayout, AppHeader, AppFooter],
 *   template: `
 *     <div mol-shell-layout maxWidth="xl">
 *       <app-header slot="header" [appName]="'Bearing'" />
 *       <router-outlet />
 *       <app-footer slot="footer" [appName]="'Bearing'" aboutHref="/about" />
 *     </div>
 *   `,
 * })
 * export class Shell {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
 *   rendering throws otherwise. No i18n or router dependency; the default
 *   content is just the typical routed child — any content works.
 * - Node props are projected content: `header` and `footer` are selected by
 *   `[slot=header]` / `[slot=footer]`, everything else lands in the main
 *   container as the default projection.
 * - The `<main>` carries no padding by default — pass `mainClassName`
 *   for vertical rhythm around routed content.
 * - Header/footer slots render as-is with no positioning — make your header
 *   sticky yourself if desired.
 * - Sibling: `@molecule/app-sidebar-layout-react` is the left-sidebar shell in
 *   React; this package is the top header/footer shell for Angular.
 *
 * @module
 */

export * from './app-shell-layout.component.js'
export * from './types.js'
