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
 * routes.
 *
 * @remarks
 * - Router required: calls `useLocation()` and renders `<Outlet />` — it
 *   throws outside a react-router `<Router>`, and the main area stays empty
 *   unless it is a layout route with child routes.
 * - Styling caveat: beyond ClassMap tokens this component hardcodes
 *   Tailwind + Material-3 utility classes (`w-60`, `bg-surface`,
 *   `border-outline-variant`, `bg-primary-container`, hover variants, …).
 *   The host app's Tailwind build must scan this package's dist (an
 *   `@source` line) or the shell renders unstyled; non-Tailwind ClassMap
 *   bonds cannot restyle these parts. `sidebarWidthClass` is likewise a raw
 *   Tailwind width utility.
 * - `icon` values are Material Symbols ligature names rendered with the
 *   `material-symbols-outlined` class — without the Material Symbols font
 *   loaded, the raw icon NAME shows as text. Omit `icon` when the font is
 *   not shipped.
 * - Active-nav highlighting picks the longest prefix-match of the current
 *   path; same-path clicks get a `#top` fragment appended (same behavior as
 *   `@molecule/app-safe-link-react`).
 * - `navAriaLabel` defaults to English "Primary navigation" — pass a
 *   translated string in localized apps (nav `label`s are plain strings;
 *   translate them upstream).
 * - Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-react`
 *   is the top header/footer shell (router-free).
 *
 * @module
 */

export * from './SidebarLayout.js'
