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
 * import { createApp, defineComponent, h } from 'vue'
 * import { RouterView } from 'vue-router'
 * import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-vue'
 *
 * const NAV: TopNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
 * ]
 *
 * const Shell = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         TopNavLayout,
 *         {
 *           appName: 'Acme',
 *           navItems: NAV,
 *           userMenu: h('button', { type: 'button' }, 'Account'),
 *         },
 *         { default: () => [h(RouterView)] },
 *       )
 *   },
 * })
 *
 * createApp(Shell).mount('#app')
 * ```
 *
 * @remarks
 * Render it as a LAYOUT ROUTE component and pass the routed view as the
 * default slot: React renders React Router's `<Outlet />` in the `<main>`, and
 * this package renders its default slot there. Nav labels are hidden below the
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
