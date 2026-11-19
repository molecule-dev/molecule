/**
 * Top app-shell header — branded logo + appName on the left, slotted actions
 * (theme toggle, extra actions, user menu) on the right.
 *
 * Vue counterpart of `@molecule/app-header-react`: the same props (React
 * names), the same DOM for the same input, the same ClassMap tokens and i18n
 * keys. Pair with `@molecule/app-shell-layout-vue`'s `<AppShellLayout>` to
 * assemble a full chrome.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { moleculePlugin } from '@molecule/app-vue'
 * import { AppHeader } from '@molecule/app-header-vue'
 * import { UserMenu } from '@molecule/app-ui-vue'
 *
 * const Shell = defineComponent({
 *   setup() {
 *     // UserMenu takes the settings panel as its DEFAULT SLOT (no renderPanel
 *     // prop); panel content dismisses the drawer via usePanelClose().
 *     return () =>
 *       h(AppHeader, { appName: 'Bearing' }, {
 *         userMenu: () => [h(UserMenu, () => [h('div', 'Your settings panel here')])],
 *       })
 *   },
 * })
 *
 * const app = createApp(Shell)
 * app.use(moleculePlugin, { theme: themeProvider, i18n: i18nProvider, router })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * - Must render inside the binding's router plugin — the brand link navigates
 *   through `useRouter()` and throws outside it.
 * - The DEFAULT `themeToggle` slot renders `<ThemeToggle />` (which calls
 *   `useTheme()` + `useTranslation()`) ONLY when the binding's theme and i18n
 *   plugins are both installed above the header — it probes their injection
 *   keys with `inject(Key, null)` first. Without those providers the toggle is
 *   silently OMITTED instead of throwing, so `<AppHeader appName="…" />`
 *   renders out of the box; it lights up automatically once they are wired.
 *   Pass `themeToggle={null}` to force-hide it, or your own node to override.
 * - Node-valued props (`userMenu`, `themeToggle`, `extraActions`) arrive as a
 *   prop AND a same-named slot; components accept either.
 * - Give `navigation` the destinations available in the current view or
 *   session: the header's inner element becomes a named `<nav>` landmark
 *   wrapping the brand and the actions, with one link per destination. Group
 *   an avatar or icon with its label in that link's children, and use
 *   `brandClassName` and the navigation classes with the app's stylesheet.
 * - `fixed` defaults to `true` (`cm.headerFixed` positions the header fixed):
 *   give the page content a matching top offset (flagships get it from
 *   `<AppShellLayout>`), or pass `fixed={false}` for an in-flow header.
 * - `logoSrc` defaults to `/logo.svg`, the file mlcl scaffolds into `public/`.
 * - Styling routes through ClassMap tokens (`cm.headerBar`, `cm.headerFixed`,
 *   `cm.headerInner`, `cm.logoText`) — requires a bonded ClassMap.
 *
 * @module
 */

export * from './AppHeader.js'
export * from './types.js'
