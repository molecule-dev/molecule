/**
 * Svelte nav-chrome shells.
 *
 * Exports:
 * - `AppShellTopNav` — top bar with logo / items / right actions.
 * - `AppShellSideNav` — vertical sidebar with items or groups, header/footer slots.
 * - `AppShellBottomNav` — mobile bottom tab bar.
 * - `AppShellFooter` — bottom page footer with logo / copyright / links / right slot.
 * - `NavItem`, `NavGroup`, `FooterLink` types.
 *
 * Every shell is pure slots — apps decide what renders in each position.
 * This is the Svelte counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names) and the same DOM for the same input. Node-valued
 * props (`logo`, `right`, `header`, `footer`, `copyright`) are snippets.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AppShellTopNav, type NavItem } from '@molecule/app-nav-chrome-svelte'
 *
 *   const navItems: NavItem[] = [
 *     { id: 'home', label: 'Home', to: '/' },
 *     { id: 'settings', label: 'Settings', to: '/settings' },
 *   ]
 * </script>
 *
 * <AppShellTopNav
 *   items={navItems}
 *   activeId="home"
 *   onItemClick={(item) => goto(item.to ?? '/')}
 * >
 *   {#snippet logo()}<img src="/logo.svg" alt="App" />{/snippet}
 *   {#snippet right()}<span>account menu slot</span>{/snippet}
 * </AppShellTopNav>
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

export * from './components.js'
export * from './types.js'
