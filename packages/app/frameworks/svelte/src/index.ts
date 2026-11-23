/**
 * Svelte framework bindings for molecule.dev.
 *
 * Provides Svelte stores and context utilities for all molecule core
 * interfaces: call `setMoleculeContext(config)` once in the root layout,
 * then consume services anywhere below via store factories
 * (`createAuthStores`, `createThemeStores`, `createI18nStores`, …).
 *
 * @example
 * ```svelte
 * <!-- +layout.svelte — wire providers ONCE, during component init -->
 * <script lang="ts">
 *   import type { Snippet } from 'svelte'
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { provider as stateProvider } from '@molecule/app-state-zustand'
 *   import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *   import { createJWTAuthClient } from '@molecule/app-auth'
 *
 *   setMoleculeContext({
 *     state: stateProvider,
 *     auth: createJWTAuthClient({ baseURL: '/api' }),
 *     theme: themeProvider,
 *   })
 *
 *   let { children }: { children: Snippet } = $props()
 * </script>
 *
 * {@render children()}
 * ```
 *
 * ```svelte
 * <!-- Component.svelte — consume via stores -->
 * <script lang="ts">
 *   import { createAuthStores, createThemeStores } from '@molecule/app-svelte'
 *
 *   const { user, isAuthenticated, logout } = createAuthStores<{ name?: string }>()
 *   const { theme, toggleTheme, mode } = createThemeStores()
 * </script>
 *
 * {#if $isAuthenticated}
 *   <div style:background={$theme.colors.background}>
 *     <h1>Welcome, {$user?.name}!</h1>
 *     <button onclick={toggleTheme}>Toggle ({$mode})</button>
 *     <button onclick={() => logout()}>Logout</button>
 *   </div>
 * {/if}
 * ```
 *
 * @example
 * ```svelte
 * <!-- Dashboard.svelte — the session, the theme and translations as stores -->
 * <script lang="ts">
 *   import { useAuth, useTheme, useTranslation } from '@molecule/app-svelte'
 *
 *   const { user, status, logout } = useAuth<{ name?: string }>()
 *   const { t } = useTranslation()
 *   const { theme, toggleTheme } = useTheme()
 * </script>
 *
 * {#if $status === 'loading'}
 *   <p>{t('auth.restoring', undefined, { defaultValue: 'Restoring session...' })}</p>
 * {:else if $status === 'unauthenticated'}
 *   <p>{t('auth.required', undefined, { defaultValue: 'Please log in.' })}</p>
 * {:else}
 *   <div style:background={$theme.colors.background}>
 *     <h1>
 *       {t('greeting.welcome', { name: $user?.name ?? '' }, { defaultValue: 'Welcome, {{name}}!' })}
 *     </h1>
 *     <button onclick={toggleTheme}>
 *       {t('theme.toggle', undefined, { defaultValue: 'Toggle theme' })}
 *     </button>
 *     <button onclick={() => logout()}>
 *       {t('auth.logout', undefined, { defaultValue: 'Log out' })}
 *     </button>
 *   </div>
 * {/if}
 * ```
 *
 * @example
 * ```svelte
 * <!-- FavoriteButton.svelte — a server-backed favorite that changes at once -->
 * <script lang="ts">
 *   import { useHttpClient, useOptimisticValue, useTranslation } from '@molecule/app-svelte'
 *
 *   interface FavoriteRecord {
 *     slug: string
 *     favorited: boolean
 *     favoritesCount: number
 *   }
 *
 *   let { article, onChanged }: {
 *     article: FavoriteRecord
 *     onChanged?: (saved: FavoriteRecord) => void
 *   } = $props()
 *
 *   const http = useHttpClient()
 *   const { t } = useTranslation()
 *   const { value: favorite, update } = useOptimisticValue({
 *     value: { favorited: article.favorited, count: article.favoritesCount },
 *     commit: async (next) => {
 *       const path = `/articles/${article.slug}/favorite`
 *       const response = next.favorited
 *         ? await http.post<{ article: FavoriteRecord }>(path)
 *         : await http.delete<{ article: FavoriteRecord }>(path)
 *       const saved = response.data.article
 *       onChanged?.(saved)
 *       return { favorited: saved.favorited, count: saved.favoritesCount }
 *     },
 *   })
 * </script>
 *
 * <button
 *   aria-pressed={$favorite.favorited}
 *   aria-label={t('article.favorite', undefined, { defaultValue: 'Favorite article' })}
 *   onclick={() => update((current) => ({
 *     favorited: !current.favorited,
 *     count: current.count + (current.favorited ? -1 : 1),
 *   }))}
 * >{$favorite.count}</button>
 * ```
 *
 * @example
 * ```svelte
 * <!-- PortaledNode.svelte — content in document.body, exactly as React renders it -->
 * <script lang="ts">
 *   import { BodyPortal } from '@molecule/app-svelte'
 * </script>
 *
 * <BodyPortal><div role="dialog">…</div></BodyPortal>
 * ```
 *
 * Session state is a three-way decision, not a boolean: `status === 'loading'`
 * is undecided, so wait for it and redirect only on
 * `status === 'unauthenticated'`; `'unavailable'` keeps the session candidate
 * for retry, so a restore that failed with anything other than a 401/403 never
 * signs the user out.
 *
 * @remarks
 * - **`setMoleculeContext` and every `create*Stores` factory use Svelte context — they are only
 *   legal during component initialization** (the top level of a component `<script>`), never in
 *   module scope, after `onMount`, in event handlers, or in async callbacks. Wire the context in
 *   the ROOT layout so every route inherits it.
 * - **Factories throw per missing service**: the context carries ONLY the services you passed —
 *   `createAuthStores()` under a context without `auth` throws. Fix the `setMoleculeContext`
 *   config; don't wrap in try/catch.
 * - Results are Svelte stores — read them with the `$` prefix (`$isAuthenticated`, `$theme`);
 *   actions (`logout`, `toggleTheme`, `setTheme`) are plain functions.
 * - In-app links are `Link` (`<Link to="/settings">`): it navigates through the router with
 *   react-router `<Link>`'s click rules. A hand-written click handler that calls `navigate()`
 *   breaks ctrl/cmd-click (new tab) unless it repeats those rules.
 * - `BodyPortal` is React's `createPortal(children, document.body)` for Svelte: Svelte itself
 *   renders the content in the target (a nested `mount`), so no node is moved after Svelte
 *   placed it. Nothing renders on the server; `target` replaces the body and `null` renders
 *   nothing until a target exists.
 *
 * @module
 */

export * from './agent-identity.js'
export * from './components/index.js'
export * from './content.js'
export * from './context.js'
export * from './hooks/index.js'
export * from './link/index.js'
export * from './providers/index.js'
export * from './routed-view/index.js'
export * from './session-ready/index.js'
export * from './stores/index.js'
export * from './types.js'
