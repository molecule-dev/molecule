/**
 * Vue vertical sidebar app shell layout.
 *
 * Exports `<SidebarLayout>` plus the `SidebarLayoutProps` and
 * `SidebarNavItem` types — fixed-width left sidebar with brand link,
 * vertical nav links, and bottom user-menu / theme-toggle slots; the main
 * area on the right scrolls and renders the routed view.
 *
 * It is the Vue counterpart of `@molecule/app-sidebar-layout-react`: same
 * props and the same DOM for the same input. React renders React Router's
 * `<Outlet />` in the main area; here the routed view (`<RouterView />`) is the
 * default slot.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { RouterView } from 'vue-router'
 * import { SidebarLayout } from '@molecule/app-sidebar-layout-vue'
 * import type { SidebarNavItem } from '@molecule/app-sidebar-layout-vue'
 *
 * const NAV: SidebarNavItem[] = [
 *   { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
 *   { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
 *   { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
 * ]
 *
 * const AppShell = defineComponent({
 *   setup() {
 *     return () =>
 *       h(SidebarLayout, { appName: 'Acme App', navItems: NAV }, {
 *         default: () => [h(RouterView)],
 *       })
 *   },
 * })
 *
 * createApp(AppShell).mount('#app')
 * ```
 *
 * @remarks
 * - Router required: reads the current location and renders router links, so
 *   it must be mounted inside the molecule router provider (the app shell
 *   does that at startup).
 * - Fully ClassMap-driven: every layout/surface/border/text/state class is
 *   resolved through `getClassMap()` (`cm.pageShell`, `cm.page`, `cm.surface`,
 *   `cm.borderR`, …), so swapping the ClassMap bond restyles the whole shell.
 *   The sidebar WIDTH is applied via inline style from `sidebarWidth`
 *   (`'sm'`|`'md'`|`'lg'`|pixel `number`); the old `sidebarWidthClass` prop is
 *   `@deprecated` — parsed to pixels, never re-emitted as a class.
 * - `icon` values are Material Symbols ligature names rendered with the
 *   `material-symbols-outlined` font class — the one documented icon-font
 *   exception. Without the font loaded, the raw icon name shows as text.
 * - Active-nav highlighting picks the longest prefix-match of the current
 *   path; same-path clicks get a `#top` fragment appended.
 * - `navAriaLabel` overrides the translated nav region name; without it the
 *   label comes from `t('sidebarLayout.aria.primaryNavigation')` (English
 *   default `'Primary navigation'`), so it follows a locale switch through its
 *   companion locale bond (`@molecule/app-locales-sidebar-layout`). Nav item
 *   `label`s stay plain caller strings — translate them upstream.
 * - Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-vue` is
 *   the top header/footer shell (router-free).
 *
 * @module
 */

export * from './SidebarLayout.js'
export * from './types.js'
