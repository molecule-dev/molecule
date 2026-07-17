/**
 * Vue Router provider for `@molecule/app-routing`.
 *
 * This package provides a Vue Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with Vue Router.
 *
 * @example
 * ```vue
 * <!-- App.vue (or a root-level component INSIDE the vue-router app) -->
 * <script setup lang="ts">
 * import { useLocation, useMoleculeRouterProvider } from '@molecule/app-routing-vue-router'
 *
 * // Builds the adapter from vue-router's useRouter()/useRoute() AND bonds it, so
 * // molecule packages using @molecule/app-routing share THIS router. No manual
 * // setRouter watch needed.
 * const router = useMoleculeRouterProvider()
 *
 * const location = useLocation()
 * function goToProfile() {
 *   router.value.navigate('/profile')
 * }
 * </script>
 *
 * <template>
 *   <p>Current path: {{ location.pathname }}</p>
 *   <button @click="goToProfile">Go to Profile</button>
 * </template>
 * ```
 *
 * @remarks
 * - **Use `useMoleculeRouterProvider()` once near the app root to bond the router.**
 *   It builds the adapter from `useRouter()`/`useRoute()` and calls
 *   `@molecule/app-routing`'s `setRouter` in an `{ immediate: true }` watch, so other
 *   molecule packages' `navigate()`/`getRouter()` drive the real Vue Router (SPA
 *   navigation). `useMoleculeRouter()` (non-bonding) still exists for local use; if you
 *   only ever call that, molecule packages silently get the core's auto-created
 *   fallback browser router and navigate with full-page reloads.
 * - **Do NOT wire the exported `provider` const** in a vue-router app — it is a
 *   no-hooks fallback (empty params, `window.location.href` navigation).
 * - Composables must run inside a component tree that has the vue-router plugin
 *   installed (`app.use(router)`), since they call `useRouter()`/`useRoute()`.
 *
 * @module @molecule/app-routing-vue-router
 */

export * from './composables.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
