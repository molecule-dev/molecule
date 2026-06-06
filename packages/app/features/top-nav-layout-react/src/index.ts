/**
 * Top-navigation app shell layout for routed React apps.
 *
 * Exports `<TopNavLayout>` — sticky header with brand link + horizontal
 * NavLinks + a user-menu slot, plus `<main>` rendering React Router's
 * `<Outlet />`. ClassMap-styled.
 *
 * @example
 * ```tsx
 * import { TopNavLayout } from '@molecule/app-top-nav-layout-react'
 *
 * const NAV = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports',   to: '/reports',   icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * <TopNavLayout appName="Acme" navItems={NAV} userMenu={<UserMenu />} />
 * ```
 * @module
 */

export * from './TopNavLayout.js'
