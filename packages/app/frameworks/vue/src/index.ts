/**
 * Vue framework bindings for molecule.dev.
 *
 * Provides Vue composables and an app plugin for all molecule core
 * interfaces: install `moleculePlugin` with your providers, then consume
 * them in components via `useAuth`, `useTheme`, `useTranslation`,
 * `useStore`, and the other composables.
 *
 * Render session-dependent UI from the three-way `status`, never a boolean
 * signed-out branch: `status === 'loading'` is undecided, redirect only on
 * `status === 'unauthenticated'`, and `'unavailable'` keeps a session candidate
 * for retry — a restore failure other than 401/403 never signs out.
 *
 * Component tests: list `@molecule/app-vue/testing/setup` in vitest's `setupFiles`. A test's
 * events then land after the render they follow, as a user's do: Vue skips a listener attached in
 * the millisecond an event was first handled, so without it a test whose container and item both
 * listen passes in one run and fails in the next. It also fails a test when the component fires an
 * event itself (`focus()`, `dispatchEvent()`) into a listener mounted in the same task, which a
 * browser can skip too.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { Link, moleculePlugin, useAuth, useTheme } from '@molecule/app-vue'
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
 *         : h(Link, { to: '/login' }, () => 'Log in')
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
 * @example
 * ```ts
 * import { defineComponent, h, type PropType } from 'vue'
 * import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-vue'
 *
 * interface FavoriteRecord {
 *   slug: string
 *   favorited: boolean
 *   favoritesCount: number
 * }
 *
 * const FavoriteButton = defineComponent({
 *   props: {
 *     article: { type: Object as PropType<FavoriteRecord>, required: true },
 *     onChanged: {
 *       type: Function as PropType<(saved: FavoriteRecord) => void>,
 *       default: undefined,
 *     },
 *   },
 *   setup(props) {
 *     const http = useHttpClient()
 *     const { t } = useTranslation()
 *     const favorite = useOptimisticValue({
 *       value: { favorited: props.article.favorited, count: props.article.favoritesCount },
 *       commit: async (next) => {
 *         const path = `/articles/${props.article.slug}/favorite`
 *         const response = next.favorited
 *           ? await http.post<{ article: FavoriteRecord }>(path)
 *           : await http.delete<{ article: FavoriteRecord }>(path)
 *         const saved = response.data.article
 *         props.onChanged?.(saved)
 *         return { favorited: saved.favorited, count: saved.favoritesCount }
 *       },
 *     })
 *     return () =>
 *       h(
 *         'button',
 *         {
 *           'aria-pressed': favorite.value.value.favorited,
 *           'aria-label': t('article.favorite', undefined, { defaultValue: 'Favorite article' }),
 *           onClick: () =>
 *             favorite.update((current) => ({
 *               favorited: !current.favorited,
 *               count: current.count + (current.favorited ? -1 : 1),
 *             })),
 *         },
 *         String(favorite.value.value.count),
 *       )
 *   },
 * })
 *
 * const FavoriteControl = defineComponent({
 *   props: {
 *     article: { type: Object as PropType<FavoriteRecord | null>, default: null },
 *   },
 *   setup(props) {
 *     return () =>
 *       props.article
 *         ? h(FavoriteButton, { key: props.article.slug, article: props.article })
 *         : null
 *   },
 * })
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
 * - In-app links are `Link` (`<Link to="/settings">`): it navigates through the router with
 *   react-router `<Link>`'s click rules. A bare `<a href>` reloads the page; a hand-written click
 *   handler that calls `navigate()` breaks ctrl/cmd-click (new tab) unless it repeats those rules.
 * - For locale-reactive text use `useTranslation()`'s `t` in components — the raw `t()` import
 *   from `@molecule/app-i18n` does not trigger re-render on locale change.
 *
 * @module
 */

export * from './agent-identity.js'
export * from './composables/index.js'
export * from './injection-keys.js'
export * from './link.js'
export * from './plugin.js'
export * from './providers.js'
export * from './routed-view.js'
export * from './session-ready.js'
export * from './types.js'
