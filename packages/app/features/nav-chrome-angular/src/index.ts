/**
 * Angular nav-chrome shells.
 *
 * Exports:
 * - `<AppShellTopNav>` — top bar with logo / items / right actions.
 * - `<AppShellSideNav>` — vertical sidebar with items or groups, header/footer slots.
 * - `<AppShellBottomNav>` — mobile bottom tab bar.
 * - `<AppShellFooter>` — bottom page footer with logo / copyright / links / right slot.
 * - `NavItem`, `NavGroup`, `FooterLink` types.
 *
 * Every shell is pure slots — apps decide what renders in each position.
 * This is the Angular counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names) and the same DOM for the same input. Node props
 * (`logo`, `right`, `header`, `footer`, `copyright`) are projected content
 * (`[slot=<name>]`) or plain string inputs.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AppShellTopNav, type NavItem } from '@molecule/app-nav-chrome-angular'
 *
 * @Component({
 *   selector: 'app-shell',
 *   standalone: true,
 *   imports: [AppShellTopNav],
 *   template: `
 *     <header mol-nav-top [items]="items" activeId="home" [onItemClick]="navigate">
 *       <img slot="logo" src="/logo.svg" alt="App" />
 *       <span slot="right">account menu slot</span>
 *     </header>
 *   `,
 * })
 * export class Shell {
 *   readonly items: NavItem[] = [
 *     { id: 'home', label: 'Home', to: '/' },
 *     { id: 'settings', label: 'Settings', to: '/settings' },
 *   ]
 *
 *   readonly navigate = (item: NavItem): void => this.router.navigateByUrl(item.to ?? '/')
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

export * from './app-shell-bottom-nav.component.js'
export * from './app-shell-footer.component.js'
export * from './app-shell-side-nav.component.js'
export * from './app-shell-top-nav.component.js'
export * from './types.js'
