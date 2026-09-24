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
 * import type { ReactNode } from 'react'
 *
 * import { AppShellFooter, AppShellTopNav, type NavItem } from '@molecule/app-nav-chrome-react'
 * import { useLocation, useNavigate } from '@molecule/app-react'
 *
 * const navItems: NavItem[] = [
 *   { id: '/', label: 'Home', to: '/' },
 *   { id: '/projects', label: 'Projects', to: '/projects', badge: <span>3</span> },
 *   { id: '/settings', label: 'Settings', to: '/settings' },
 * ]
 *
 * export function AppLayout({ children }: { children: ReactNode }) {
 *   const navigate = useNavigate()
 *   const { pathname } = useLocation()
 *   return (
 *     <>
 *       <AppShellTopNav
 *         logo={<strong>Acme</strong>}
 *         items={navItems}
 *         activeId={pathname}
 *         onItemClick={(item) => item.to && navigate(item.to)}
 *         right={<button type="button" onClick={() => navigate('/account')}>Account</button>}
 *       />
 *       <main>{children}</main>
 *       <AppShellFooter
 *         copyright={`© ${new Date().getFullYear()} Acme Inc.`}
 *         links={[{ label: 'Privacy', to: '/privacy' }, { label: 'Terms', to: '/terms' }]}
 *       />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring. The example's
 * `useNavigate()` / `useLocation()` come from `@molecule/app-react` and throw outside its
 * `RouterProvider`; the shells themselves need no router.
 *
 * `activeId` is matched against `NavItem.id` (NOT `to`) — use the route path as the id, as above,
 * to highlight the current page via `aria-current="page"`.
 *
 * Router-agnostic BY DESIGN: nav items render as `<button>` elements,
 * never links — `NavItem.to` is only carried through so YOUR
 * `onItemClick` can hand it to whatever router the app uses. Without an
 * `onItemClick` handler, clicking a nav item does nothing. Only
 * `AppShellFooter` links render real `<a href>` elements.
 *
 * The shells ship no surface/background/positioning of their own —
 * sticky headers, sidebar widths, borders, and elevation are the
 * caller's `className` / layout concern.
 *
 * @module
 */

export * from './AppShellBottomNav.js'
export * from './AppShellFooter.js'
export * from './AppShellSideNav.js'
export * from './AppShellTopNav.js'
export * from './types.js'
