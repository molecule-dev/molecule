/**
 * Vue framework bindings for molecule.dev.
 *
 * Provides Vue composables and an app plugin for all molecule core
 * interfaces: install `moleculePlugin` with your providers, then consume
 * them in components via `useAuth`, `useTheme`, `useTranslation`,
 * `useStore`, and the other composables.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { moleculePlugin, useAuth, useTheme } from '@molecule/app-vue'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 * import { createJWTAuthClient } from '@molecule/app-auth'
 *
 * const Dashboard = defineComponent({
 *   setup() {
 *     // Composables are inject()-based: call them here in setup(), nowhere else.
 *     const { user, isAuthenticated, logout } = useAuth<{ name?: string }>()
 *     const { theme, toggleTheme } = useTheme()
 *     return () =>
 *       isAuthenticated.value
 *         ? h('div', { style: { background: theme.value.colors.background } }, [
 *             h('h1', `Welcome, ${user.value?.name ?? ''}!`),
 *             h('button', { onClick: toggleTheme }, 'Toggle theme'),
 *             h('button', { onClick: () => logout() }, 'Log out'),
 *           ])
 *         : h('a', { href: '/login' }, 'Log in')
 *   },
 * })
 *
 * const app = createApp(Dashboard)
 * app.use(moleculePlugin, {
 *   state: stateProvider,
 *   auth: createJWTAuthClient({ baseURL: '/api' }),
 *   theme: themeProvider,
 * })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * - **Composables work only inside `setup()` / `<script setup>`** (they use `inject()`), and
 *   each one throws when `moleculePlugin` was not installed with that service — the plugin
 *   provides ONLY the options you pass. Fix the `app.use(moleculePlugin, …)` options; don't
 *   catch the error.
 * - Returned state is Vue refs/computed — templates auto-unwrap (`{{ user?.name }}`), but
 *   script code needs `.value` (`isAuthenticated.value`). `useStore` returns a `Ref` of the
 *   selected state.
 * - For locale-reactive text use `useTranslation()`'s `t` in components — the raw `t()` import
 *   from `@molecule/app-i18n` does not trigger re-render on locale change.
 *
 * @module
 */

export * from './composables/index.js'
export * from './injection-keys.js'
export * from './plugin.js'
export * from './types.js'
