/**
 * Vue top-level app shell layout.
 *
 * Exports `<AppShellLayout>` — header + main content + footer, with the page
 * frame styled via the ClassMap bond. Apps fill the slots with their own
 * AppHeader (`@molecule/app-header-vue`), AppFooter (`@molecule/app-footer-vue`),
 * and route content (typically `<RouterView />`). It is the Vue counterpart of
 * `@molecule/app-shell-layout-react`: same props and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { AppShellLayout } from '@molecule/app-shell-layout-vue'
 * import { AppHeader } from '@molecule/app-header-vue'
 * import { AppFooter } from '@molecule/app-footer-vue'
 *
 * const Shell = defineComponent({
 *   setup() {
 *     return () =>
 *       h(AppShellLayout, { header: h(AppHeader, { appName: 'Bearing' }) }, {
 *         default: () => [h(RouterView)],
 *         footer: () => [h(AppFooter, { appName: 'Bearing', aboutHref: '/about' })],
 *       })
 *   },
 * })
 *
 * createApp(Shell).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
 *   rendering throws otherwise. No i18n or router dependency; `<RouterView />`
 *   is just the typical default slot — any content works.
 * - The `<main>` carries no padding by default — pass `mainClassName`
 *   (e.g. `cm.sp('py', 8)`) for vertical rhythm around routed content.
 * - Header/footer slots render as-is with no positioning — make your header
 *   sticky yourself if desired. Node-valued props arrive as a prop AND a
 *   same-named slot; components accept either.
 * - Sibling: `@molecule/app-sidebar-layout-react` is the left-sidebar shell
 *   (router-coupled); THIS package is the top header/footer shell.
 *
 * @module
 */

export * from './AppShellLayout.js'
export * from './types.js'
