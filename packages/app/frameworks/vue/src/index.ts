/**
 * Vue framework bindings for molecule.dev.
 *
 * Provides Vue composables and an app plugin for all molecule core
 * interfaces: install `moleculePlugin` with your providers, then consume
 * them in components via `useAuth`, `useTheme`, `useTranslation`,
 * `useStore`, and the other composables.
 *
 * @example
 * ```typescript
 * import { createApp, defineComponent, h } from 'vue'
 *
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 * import { moleculePlugin, useAuth, useStore, useTheme, useTranslation } from '@molecule/app-vue'
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * registerLocaleModule(commonLocales) // translations for the `auth.*` / `common.*` / `theme.*` keys below
 * const inbox = stateProvider.createStore({ initialState: { unread: 3 } })
 *
 * const Dashboard = defineComponent({
 *   setup() {
 *     // Composables are inject()-based: call them here in setup(), nowhere else.
 *     const { user, isAuthenticated } = useAuth<User>()
 *     const { t } = useTranslation()
 *     const { mode, toggleTheme } = useTheme()
 *     const unread = useStore(inbox, { selector: (state) => state.unread })
 *
 *     return () =>
 *       h('main', { 'data-theme': mode.value }, [
 *         h(
 *           'h1',
 *           isAuthenticated.value
 *             ? t('auth.modal.loggedInAs', { who: user.value?.name ?? '' }, { defaultValue: 'Logged in as {{who}}' })
 *             : t('auth.login.logIn', undefined, { defaultValue: 'Log in' }),
 *         ),
 *         h('p', t('common.countUnread', { count: unread.value }, { defaultValue: '{{count}} unread' })),
 *         h(
 *           'button',
 *           { type: 'button', onClick: () => inbox.setState({ unread: 0 }) },
 *           t('common.markAllRead', undefined, { defaultValue: 'Mark all read' }),
 *         ),
 *         h(
 *           'button',
 *           { type: 'button', 'data-mol-id': 'toggle-theme', onClick: toggleTheme },
 *           t('theme.toggle', undefined, { defaultValue: 'Toggle theme' }),
 *         ),
 *       ])
 *   },
 * })
 *
 * const app = createApp(Dashboard)
 * app.use(moleculePlugin, {
 *   state: stateProvider,
 *   auth: createJWTAuthClient<User>({ baseURL: '/api' }),
 *   theme: themeProvider,
 *   i18n: getI18nProvider(),
 * })
 * app.mount('#app') // index.html contains <div id="app"></div>
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
 * - `useTheme().toggleTheme()` cycles through the provider's `getThemes()` list (light → dark
 *   with `@molecule/app-theme-css-variables`). `useTheme`/`useTranslation` subscribe in
 *   `onMounted`, so they only react once the component is mounted.
 * - For locale-reactive text use `useTranslation()`'s `t` in components — the raw `t()` import
 *   from `@molecule/app-i18n` does not trigger re-render on locale change.
 *
 * @module
 */

export * from './composables/index.js'
export * from './injection-keys.js'
export * from './plugin.js'
export * from './types.js'
