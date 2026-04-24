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
 * @module
 */

export * from './AppShellBottomNav.js'
export * from './AppShellFooter.js'
export * from './AppShellSideNav.js'
export * from './AppShellTopNav.js'
export * from './types.js'
