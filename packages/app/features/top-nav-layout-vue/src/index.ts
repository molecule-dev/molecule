/**
 * Vue top navigation app shell layout for routed Vue apps.
 *
 * Exports `<TopNavLayout>` — sticky header with brand link + horizontal
 * router links + a user-menu slot, plus the `<main>` holding the routed page
 * body — and the `TopNavItem` / `TopNavLayoutProps` types. It is the Vue
 * counterpart of `@molecule/app-top-nav-layout-react`: the same props (React
 * names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-vue'
 *
 * const NAV: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * // The layout route's component: its `<main>` renders the matched child route.
 * export const Shell = defineComponent({
 *   setup() {
 *     return () =>
 *       h(TopNavLayout, {
 *         appName: 'Acme',
 *         navItems: NAV,
 *         userMenu: h('button', { type: 'button' }, 'Account'),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Render it as a LAYOUT ROUTE component: without a default slot the `<main>`
 * renders `RoutedView` from `@molecule/app-vue` (the matched child route,
 * through the app's routing bond), as React's renders its children or
 * `<RoutedView />`; a default slot takes its place. Nav labels are hidden below the
 * `md` breakpoint (icon-only mobile nav), so always provide `icon` names; they
 * render as Material Symbols ligatures and need the Material Symbols font
 * loaded by the host app. Styling comes from the bonded ClassMap, so a
 * theme/ClassMap bond is a prerequisite. Node-valued props (`userMenu`) arrive
 * as a prop AND a same-named slot; the component accepts either. `label` is
 * rendered as-is: pass an already-translated string.
 *
 * @module
 */

export * from './TopNavLayout.js'
export * from './types.js'
