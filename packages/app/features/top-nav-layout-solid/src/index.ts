/**
 * Solid top navigation app shell layout for routed Solid apps.
 *
 * Exports `TopNavLayout` — sticky header with brand link + horizontal router
 * links + a user-menu slot, plus the `<main>` holding the routed page body —
 * and the `TopNavItem` / `TopNavLayoutProps` types. It is the Solid
 * counterpart of `@molecule/app-top-nav-layout-react`: the same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-solid'
 *
 * const NAV: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * export function Shell() {
 *   return (
 *     <TopNavLayout
 *       appName="Acme"
 *       navItems={NAV}
 *       userMenu={<button type="button">Account</button>}
 *     >
 *       <main>…routed content…</main>
 *     </TopNavLayout>
 *   )
 * }
 * ```
 *
 * @remarks
 * Render it as a LAYOUT ROUTE component and pass the routed view as
 * `children`: React renders React Router's `<Outlet />` in the `<main>`, and
 * this package renders `children` there. Nav labels are hidden below the `md`
 * breakpoint (icon-only mobile nav), so always provide `icon` names; they
 * render as Material Symbols ligatures and need the Material Symbols font
 * loaded by the host app. Styling comes from the bonded ClassMap, so a
 * theme/ClassMap bond is a prerequisite. `label` is rendered as-is: pass an
 * already-translated string.
 *
 * @module
 */

export * from './TopNavLayout.jsx'
export * from './types.js'
