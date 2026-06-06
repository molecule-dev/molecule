/**
 * Vertical sidebar app shell layout.
 *
 * Exports `<SidebarLayout>` — fixed-width left sidebar with brand link +
 * vertical NavLinks + user-menu slot, scrollable main area on the right
 * rendering React Router's `<Outlet />`. ClassMap-styled.
 *
 * @example
 * ```tsx
 * import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
 *
 * import { UserMenu } from './UserMenu.js'
 *
 * const NAV = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
 *   { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
 * ]
 *
 * export function AppShell() {
 *   return (
 *     <SidebarLayout
 *       appName="Acme App"
 *       navItems={NAV}
 *       userMenu={<UserMenu />}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './SidebarLayout.js'
