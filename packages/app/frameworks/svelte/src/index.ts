/**
 * Svelte framework bindings for molecule.dev.
 *
 * Provides Svelte stores and context utilities for all molecule core
 * interfaces: call `setMoleculeContext(config)` once in the root layout,
 * then consume services anywhere below via store factories
 * (`createAuthStores`, `createThemeStores`, `createI18nStores`, …).
 *
 * @example
 * ```typescript
 * // src/lib/molecule.ts — app-wide stores, importable from any .svelte file.
 * import { get } from 'svelte/store'
 *
 * import { createJWTAuthClient } from '@molecule/app-auth'
 * import { createAuthStoresFromClient, createThemeStoresFromProvider } from '@molecule/app-svelte'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * interface User {
 *   id: string
 *   name: string
 * }
 *
 * const authClient = createJWTAuthClient<User>({ baseURL: '/api' })
 *
 * // Readable stores + plain action functions. In a component read them with `$`:
 * // {#if $isAuthenticated}<h1>{$user?.name}</h1>{/if}  <button onclick={toggleTheme}>{$mode}</button>
 * export const { user, isAuthenticated, login, logout } = createAuthStoresFromClient(authClient)
 * export const { mode, toggleTheme } = createThemeStoresFromProvider(themeProvider)
 *
 * // e.g. a login form's submit handler:
 * export async function signIn(email: string, password: string): Promise<boolean> {
 *   await login({ email, password }) // POST /api/auth/login
 *   return get(isAuthenticated) // true — `$user` now holds the returned user
 * }
 * ```
 *
 * @remarks
 * - **Two wiring styles — don't mix them up.** Context style: `setMoleculeContext({...})` in the
 *   ROOT layout, then `createAuthStores()` / `createThemeStores()` / `createI18nStores()` in
 *   components. Explicit style (above): `createAuthStoresFromClient(client)`,
 *   `createThemeStoresFromProvider(p)`, `createI18nStoresFromProvider(p)` — no context, legal in
 *   plain `.ts` modules. Only the context style has the component-init restriction below.
 * - **`setMoleculeContext` and every `create*Stores` factory use Svelte context — they are only
 *   legal during component initialization** (the top level of a component `<script>`), never in
 *   module scope, after `onMount`, in event handlers, or in async callbacks. Wire the context in
 *   the ROOT layout so every route inherits it.
 * - **Factories throw per missing service**: the context carries ONLY the services you passed —
 *   `createAuthStores()` under a context without `auth` throws. Fix the `setMoleculeContext`
 *   config; don't wrap in try/catch.
 * - **`$t` from the i18n stores takes `(key, values)` only — there is no `defaultValue`
 *   option**, and a missing key renders the key itself. Register translations (a locale bond)
 *   before relying on it, or call `t(key, values, { defaultValue })` from `@molecule/app-i18n`.
 * - `toggleTheme()` cycles through the provider's `getThemes()` list (light → dark with
 *   `@molecule/app-theme-css-variables`); it is not a light/dark mode flip.
 * - Results are Svelte stores — read them with the `$` prefix (`$isAuthenticated`, `$theme`);
 *   actions (`logout`, `toggleTheme`, `setTheme`) are plain functions.
 *
 * @module
 */

export * from './context.js'
export * from './stores/index.js'
export * from './types.js'
