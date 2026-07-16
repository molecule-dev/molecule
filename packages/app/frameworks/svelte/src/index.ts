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
 * </script>
 *
 * <slot />
 *
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
 *     <button on:click={toggleTheme}>Toggle ({$mode})</button>
 *     <button on:click={() => logout()}>Logout</button>
 *   </div>
 * {/if}
 * ```
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
 *
 * @module
 */

export * from './context.js'
export * from './stores/index.js'
export * from './types.js'
