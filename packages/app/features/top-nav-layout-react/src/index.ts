/**
 * Top-navigation app shell layout for routed React apps.
 *
 * Exports `<TopNavLayout>` — sticky header with brand link + horizontal
 * NavLinks + a user-menu slot, plus `<main>` rendering React Router's
 * `<Outlet />` — and the `TopNavItem` / `TopNavLayoutProps` types.
 *
 * @example
 * ```tsx
 * import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-react'
 *
 * const NAV: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * const userMenu = <button type="button">Account</button>
 *
 * <TopNavLayout appName="Acme" navItems={NAV} userMenu={userMenu} />
 * ```
 *
 * @remarks
 * Requires React Router: render it as a LAYOUT ROUTE element
 * (`<Route element={<TopNavLayout ... />}>` with child routes) — the page
 * body comes from the router `<Outlet />`, never from children. Nav labels
 * are hidden below the `md` breakpoint (icon-only mobile nav), so always
 * provide `icon` names; they render as Material Symbols ligatures and need
 * the Material Symbols font loaded by the host app. Styling mixes ClassMap
 * calls with raw Tailwind + Material-3 tokens (`bg-surface`,
 * `bg-primary-container`, `hidden md:inline`), so a Tailwind build that
 * source-scans this package's dist and a theme defining those tokens are
 * prerequisites — under a non-Tailwind ClassMap bond the header renders
 * unstyled. `label` is rendered as-is: pass an already-translated string.
 *
 * @module
 */

export * from './TopNavLayout.js'
