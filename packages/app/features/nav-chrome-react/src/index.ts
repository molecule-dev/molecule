/**
 * React nav-chrome shells.
 *
 * Exports:
 * - `<AppShellTopNav>` — top bar with logo / items / right actions.
 * - `<AppShellSideNav>` — vertical sidebar with items or groups, header/footer slots.
 * - `<AppShellBottomNav>` — mobile bottom tab bar.
 * - `<AppShellFooter>` — bottom page footer with logo / copyright / links / right slot.
 * - `NavItem`, `NavGroup`, `FooterLink` types.
 *
 * Every shell is pure slots — apps decide what renders in each position.
 *
 * @example
 * ```tsx
 * import { AppShellTopNav, AppShellSideNav } from '@molecule/app-nav-chrome-react'
 *
 * const navItems = [
 *   { id: 'home', label: 'Home', to: '/' },
 *   { id: 'settings', label: 'Settings', to: '/settings' },
 * ]
 *
 * <AppShellTopNav
 *   logo={<img src="/logo.svg" alt="App" />}
 *   items={navItems}
 *   activeId="home"
 *   onItemClick={(item) => router.push(item.to!)}
 *   right={<UserMenu />}
 * />
 * ```
 *
 * @module
 */

export * from './AppShellBottomNav.js'
export * from './AppShellFooter.js'
export * from './AppShellSideNav.js'
export * from './AppShellTopNav.js'
export * from './types.js'
