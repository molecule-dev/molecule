/**
 * Top-navigation app shell layout for routed React apps.
 *
 * Exports `<TopNavLayout>` — sticky header with brand link + horizontal
 * NavLinks + a user-menu slot, plus `<main>` rendering React Router's
 * `<Outlet />` — and the `TopNavItem` / `TopNavLayoutProps` types.
 *
 * @example
 * ```tsx
 * import { createBrowserRouter, Link, RouterProvider } from 'react-router'
 *
 * import { type TopNavItem, TopNavLayout } from '@molecule/app-top-nav-layout-react'
 *
 * const navItems: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * const router = createBrowserRouter([
 *   {
 *     path: '/',
 *     element: <TopNavLayout appName="Acme" navItems={navItems} userMenu={<Link to="/account">Account</Link>} />,
 *     children: [
 *       { path: 'dashboard', element: <h1>Dashboard</h1> },
 *       { path: 'reports', element: <h1>Reports</h1> },
 *     ],
 *   },
 * ])
 *
 * export function App() {
 *   return <RouterProvider router={router} />
 * }
 * ```
 *
 * @remarks
 * It has NO `children` prop — passing page content as children renders
 * nothing. Requires a wired ClassMap bond (`setClassMap(classMap)` from
 * `@molecule/app-ui`; `getClassMap()` throws otherwise) and `react-router`
 * (peer dep — NOT `react-router-dom`). The active link is the router's
 * `NavLink` match (`aria-current="page"`).
 *
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
