/**
 * Vertical sidebar app shell layout.
 *
 * Exports `<SidebarLayout>` plus the `SidebarLayoutProps` and
 * `SidebarNavItem` types — fixed-width left sidebar with brand link,
 * vertical nav links, and bottom user-menu / theme-toggle slots; the main
 * area on the right scrolls and renders React Router's `<Outlet />` for
 * nested routes.
 *
 * @example
 * ```tsx
 * import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
 * import type { SidebarNavItem } from '@molecule/app-sidebar-layout-react'
 *
 * const NAV: SidebarNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
 *   { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
 * ]
 *
 * function AppShell() {
 *   return <SidebarLayout appName="Acme App" navItems={NAV} />
 * }
 * ```
 *
 * Mount it as a LAYOUT ROUTE so child routes render in the main area:
 * a parent route with `element={<AppShell />}` and your pages as child
 * routes. Without children it renders `<RoutedView />` from
 * `@molecule/app-react` (the matched child route, under any routing bond);
 * pass the page as children where the router hands it over that way.
 *
 * @remarks
 * - Router required: reads the location through `@molecule/app-react` and
 *   throws an error naming the fix without the router component of the app's
 *   routing bond above it (or, given no children, under a bond with no routed
 *   view).
 * - Fully ClassMap-driven: every layout/surface/border/text/state class is
 *   resolved through `getClassMap()` (`cm.pageShell`, `cm.page`, `cm.surface`,
 *   `cm.borderR`, `cm.bgPrimarySubtle`/`cm.textPrimary` for the active item,
 *   `cm.textMuted`/`cm.link` for the rest, …), so swapping the ClassMap bond
 *   restyles the whole shell — no raw Tailwind/Material-3 utility class is
 *   baked in. The sidebar WIDTH is the one "specific value" a styling-agnostic
 *   ClassMap can't express, so it is applied via inline style: use the
 *   stack-agnostic `sidebarWidth` prop (`'sm'`|`'md'`|`'lg'`|pixel `number`),
 *   NOT a Tailwind width utility. The old `sidebarWidthClass` prop is
 *   `@deprecated` — still accepted, but its `w-<n>` value is parsed to pixels
 *   (never re-emitted as a class).
 * - `icon` values are Material Symbols ligature names rendered with the
 *   `material-symbols-outlined` font class — the one documented icon-font
 *   exception (a font ligature the consumer supplies as data, not a hardcoded
 *   chrome glyph). Without the Material Symbols font loaded, the raw icon NAME
 *   shows as text — omit `icon` when the font is not shipped.
 * - Active-nav highlighting picks the longest prefix-match of the current
 *   path; same-path clicks get a `#top` fragment appended (same behavior as
 *   `@molecule/app-safe-link-react`).
 * - `navAriaLabel` overrides the translated nav region name; without it the
 *   label comes from `t('sidebarLayout.aria.primaryNavigation')` (English
 *   default `'Primary navigation'`), so it follows a locale switch through its
 *   companion locale bond (`@molecule/app-locales-sidebar-layout`). Nav item
 *   `label`s stay plain caller strings — translate them upstream.
 * - Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-react`
 *   is the top header/footer shell (router-free).
 *
 * @module
 */

export * from './SidebarLayout.js'
