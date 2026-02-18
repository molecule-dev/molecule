/**
 * Svelte framework bindings for molecule.dev.
 *
 * Provides Svelte-specific stores and context utilities for all molecule
 * core interfaces. This package enables the use of molecule's framework-agnostic
 * interfaces with Svelte's idioms (stores, context, etc.).
 *
 * @example
 * ```svelte
 * <!-- +layout.svelte -->
 * <script>
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { provider as stateProvider } from '@molecule/app-state-zustand'
 *
 *   setMoleculeContext({
 *     state: stateProvider,
 *     auth: authClient,
 *     theme: themeProvider,
 *   })
 * </script>
 *
 * <slot />
 *
 * <!-- Component.svelte -->
 * <script>
 *   import { createAuthStores, createThemeStores } from '@molecule/app-svelte'
 *
 *   const { user, isAuthenticated, logout } = createAuthStores()
 *   const { theme, toggleTheme, mode } = createThemeStores()
 * </script>
 *
 * {#if $isAuthenticated}
 *   <div style:background={$theme.colors.background}>
 *     <h1>Welcome, {$user?.name}!</h1>
 *     <button on:click={toggleTheme}>Toggle ({$mode})</button>
 *     <button on:click={logout}>Logout</button>
 *   </div>
 * {/if}
 * ```
 *
 * @module
 */

export * from './context.js'
export * from './stores/index.js'
export * from './types.js'
