/**
 * Svelte bindings for `@molecule/app-analytics`.
 *
 * Provides ready-made Svelte components that consume the wired analytics
 * bond. Currently exports `AnalyticsRouteListener`, a render-free
 * component that fires a `page` event on every client-side route change.
 *
 * Mount `AnalyticsRouteListener` once inside the molecule context's router
 * scope — it follows `useLocation()` and forwards each pathname / search
 * change to the wired analytics bond's `page()`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { AnalyticsRouteListener } from '@molecule/app-analytics-svelte'
 *   import { Home } from './Home.svelte'
 *
 *   let { router } = $props()
 *   setMoleculeContext({ router })
 * </script>
 *
 * <AnalyticsRouteListener />
 * <Home />
 * ```
 *
 * @module
 */

export * from './components.js'
