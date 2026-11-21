/**
 * Solid nav-chrome shells.
 *
 * Exports:
 * - `AppShellTopNav` — top bar with logo / items / right actions.
 * - `AppShellSideNav` — vertical sidebar with items or groups, header/footer slots.
 * - `AppShellBottomNav` — mobile bottom tab bar.
 * - `AppShellFooter` — bottom page footer with logo / copyright / links / right slot.
 * - `NavItem`, `NavGroup`, `FooterLink` types.
 *
 * Every shell is pure slots — apps decide what renders in each position.
 * This is the Solid counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { AppShellFooter, AppShellTopNav, type NavItem } from '@molecule/app-nav-chrome-solid'
 *
 * const navItems: NavItem[] = [
 *   { id: 'home', label: 'Home', to: '/' },
 *   { id: 'settings', label: 'Settings', to: '/settings' },
 * ]
 *
 * export function Shell() {
 *   return (
 *     <AppShellTopNav
 *       logo={<img src="/logo.svg" alt="App" />}
 *       items={navItems}
 *       activeId="home"
 *       onItemClick={(item) => navigate(item.to ?? '/')}
 *       right={<span>account menu slot</span>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * Router-agnostic BY DESIGN: nav items render as `<button>` elements,
 * never links — `NavItem.to` is only carried through so YOUR
 * `onItemClick` can hand it to whatever router the app uses. Only
 * `AppShellFooter` links render real `<a href>` elements.
 *
 * The shells ship no surface/background/positioning of their own — sticky
 * headers, sidebar widths, borders, and elevation are the caller's
 * `className` / layout concern.
 *
 * @module
 */

export * from './AppShellBottomNav.jsx'
export * from './AppShellFooter.jsx'
export * from './AppShellSideNav.jsx'
export * from './AppShellTopNav.jsx'
export * from './types.js'
