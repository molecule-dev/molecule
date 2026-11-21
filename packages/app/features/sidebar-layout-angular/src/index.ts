/**
 * Angular vertical sidebar app shell layout — the counterpart of
 * `@molecule/app-sidebar-layout-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<SidebarLayout>` plus the `SidebarLayoutProps` and `SidebarNavItem`
 * types — fixed-width left sidebar with brand link, vertical nav links, and
 * bottom user-menu / theme-toggle slots; the main area on the right scrolls and
 * renders the routed page.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SidebarLayout } from '@molecule/app-sidebar-layout-angular'
 *
 * const NAV = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
 *   { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
 * ]
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [SidebarLayout],
 *   template: `
 *     <div mol-sidebar-layout [appName]="'Acme App'" [navItems]="NAV">
 *       <app-user-menu slot="userMenu" />
 *       <router-outlet />
 *     </div>
 *   `,
 * })
 * export class Shell {
 *   readonly NAV = NAV
 * }
 * ```
 *
 * @remarks
 * - Router required: reads the current location and renders router links, so
 *   it must be mounted inside the molecule router provider (the app shell
 *   does that at startup).
 * - Node props are projected content: the bottom slots are selected by
 *   `[slot=userMenu]` / `[slot=themeToggle]`, everything else lands in the main
 *   container as the default projection (React's `<Outlet />`).
 * - Fully ClassMap-driven: every layout/surface/border/text/state class is
 *   resolved through `getClassMap()` (`cm.pageShell`, `cm.page`, `cm.surface`,
 *   `cm.borderR`, …), so swapping the ClassMap bond restyles the whole shell.
 *   The sidebar WIDTH is applied via inline style from `sidebarWidth`
 *   (`'sm'`|`'md'`|`'lg'`|pixel `number`); the old `sidebarWidthClass` prop is
 *   `@deprecated` — parsed to pixels, never re-emitted as a class.
 * - `icon` values are Material Symbols ligature names rendered with the
 *   `material-symbols-outlined` font class — the one documented icon-font
 *   exception. Without the font loaded, the raw icon name shows as text.
 * - Active-nav highlighting picks the longest prefix-match of the current
 *   path; same-path links get a `#top` fragment appended.
 * - `navAriaLabel` overrides the translated nav region name; without it the
 *   label comes from `t('sidebarLayout.aria.primaryNavigation')` (English
 *   default `'Primary navigation'`), so it follows a locale switch through its
 *   companion locale bond (`@molecule/app-locales-sidebar-layout`). Nav item
 *   `label`s stay plain caller strings — translate them upstream.
 * - Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-angular`
 *   is the top header/footer shell (router-free).
 *
 * @module
 */

export * from './sidebar-layout.component.js'
export * from './types.js'
