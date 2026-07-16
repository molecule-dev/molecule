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
 * import { watch } from 'vue'
 * import { setRouter } from '@molecule/app-routing'
 * import { useLocation, useMoleculeRouter } from '@molecule/app-routing-vue-router'
 *
 * // Builds the adapter from vue-router's useRouter()/useRoute() and keeps it fresh.
 * const router = useMoleculeRouter()
 *
 * // Bond it so molecule packages using @molecule/app-routing share THIS router.
 * watch(router, (r) => setRouter(r), { immediate: true })
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
 * - **The composables alone do NOT bond the router.** `useMoleculeRouter()` builds a
 *   local adapter; without the `setRouter` watch shown above, other molecule packages
 *   silently get `@molecule/app-routing`'s auto-created fallback browser router and
 *   navigate with full-page reloads.
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
