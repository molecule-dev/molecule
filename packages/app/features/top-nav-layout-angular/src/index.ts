/**
 * Angular top navigation app shell layout — the counterpart of
 * `@molecule/app-top-nav-layout-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<TopNavLayout>` — sticky header with brand link + horizontal router
 * links + a user-menu slot, plus the `<main>` holding the routed page body
 * (React renders its router's `<Outlet />` there) — and the `TopNavItem` /
 * `TopNavLayoutProps` types.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-angular'
 *
 * const NAV: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [TopNavLayout],
 *   template: `
 *     <div
 *       mol-top-nav-layout
 *       appName="Acme"
 *       [navItems]="nav"
 *     >
 *       <button type="button" slot="userMenu">Account</button>
 *       <router-outlet />
 *     </div>
 *   `,
 * })
 * export class Shell {
 *   nav = NAV
 * }
 * ```
 *
 * @remarks
 * Use it as a LAYOUT component and project the routed page as the element's
 * default content (Angular's own `<router-outlet />`); the user menu is
 * projected as `[slot=userMenu]`. Nav labels are hidden below the `md`
 * breakpoint (icon-only mobile nav), so always provide `icon` names; they
 * render as Material Symbols ligatures and need the Material Symbols font
 * loaded by the host app. Styling comes from the bonded ClassMap, so a
 * theme/ClassMap bond is a prerequisite. `label` is rendered as-is: pass an
 * already-translated string.
 *
 * @module
 */

export * from './top-nav-layout.component.js'
export * from './types.js'
